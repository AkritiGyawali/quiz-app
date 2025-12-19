from flask import Flask, send_from_directory, request, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import yaml
import random
import time
import threading
import os
from typing import Dict, Any

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Load questions from file
questions_data = []
try:
    # JSON format
    # with open(os.path.join(os.path.dirname(__file__), 'data', 'gk_sansthan.json'), 'r', encoding='utf-8') as f:
    #     questions_data = json.load(f)
    
    # YAML format
    with open(os.path.join(os.path.dirname(__file__), 'data', 'math.yaml'), 'r', encoding='utf-8') as f:
        questions_data = yaml.safe_load(f)
    
    print(f"Loaded {len(questions_data)} questions.")
except Exception as err:
    print(f"Error loading questions: {err}")

# Game State Storage (In-memory)
rooms: Dict[str, Dict[str, Any]] = {}

# Constants
QUESTION_TIME = 15
SCORE_CORRECT = 5
SCORE_WRONG = -5

# Serve static files
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/exam')
def exam():
    # Load questions from math.yaml for exam mode
    with open(os.path.join(os.path.dirname(__file__), 'data', 'math.yaml'), 'r', encoding='utf-8') as f:
        questions = yaml.safe_load(f)
    return render_template('exam.html', questions=questions)

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

# Socket event handlers
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f'User connected: {sid}')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f'User disconnected: {sid} - giving grace period for reconnection')
    
    # Give 30 second grace period for reconnection
    def cleanup_after_grace_period():
        time.sleep(30)
        
        # Check if still disconnected after grace period
        for code in list(rooms.keys()):
            room = rooms.get(code)
            if not room:
                continue
                
            if room.get('hostId') == sid:
                # Host didn't reconnect, destroy room
                print(f'Host {sid} did not reconnect, ending game {code}')
                socketio.emit('game_ended', {'reason': "Host disconnected"}, to=code)
                room['timer_stop'] = True
                if code in rooms:
                    del rooms[code]
            else:
                # Check if player didn't reconnect
                players = room.get('players', [])
                for i, player in enumerate(players):
                    if player['id'] == sid:
                        print(f'Player {player["name"]} did not reconnect, removing from game {code}')
                        players.pop(i)
                        socketio.emit('update_players', players, to=code)
                        break
    
    # Start grace period timer in background
    cleanup_thread = threading.Thread(target=cleanup_after_grace_period)
    cleanup_thread.daemon = True
    cleanup_thread.start()

# --- HOST EVENTS ---
@socketio.on('host_create_game')
def handle_host_create_game():
    sid = request.sid
    print(f"host_create_game received from: {sid}")
    
    room_code = str(random.randint(100000, 999999))
    rooms[room_code] = {
        'status': 'LOBBY',
        'hostId': sid,
        'players': [],
        'currentQuestionIndex': 0,
        'timer_thread': None,
        'timer_stop': False,
        'answers': {},
        'gameQuestions': [],
        'questionStartTime': None,
        'answerTimes': {},
        'gameMode': 'manual',
        'autoDelay': 5
    }
    join_room(room_code)
    emit('game_created', {'roomCode': room_code})
    print(f"Game created: {room_code}")

@socketio.on('host_start_game')
def handle_host_start_game(data):
    sid = request.sid
    room_code = data.get('roomCode')
    room = rooms.get(room_code)
    
    if not room or room['hostId'] != sid:
        print(f"Invalid host_start_game request")
        return

    # Store game mode settings
    room['gameMode'] = data.get('gameMode', 'manual')
    room['autoDelay'] = data.get('autoDelay', 5)
    print(f"Game mode: {room['gameMode']}, Auto delay: {room['autoDelay']}s")

    # Filter questions with ID 5 to 10
    room['gameQuestions'] = [q for q in questions_data if 5 <= q['id'] <= 10]

    # Fallback: If filter finds nothing, load all questions
    if len(room['gameQuestions']) == 0:
        print("Filter returned empty, loading all questions.")
        room['gameQuestions'] = questions_data[:]
    
    random.shuffle(room['gameQuestions'])
    print(f"Starting game with {len(room['gameQuestions'])} questions")

    room['status'] = 'GAME_ACTIVE'
    room['currentQuestionIndex'] = 0
    
    # Reset scores
    for player in room['players']:
        player['score'] = 0
        player['totalResponseTime'] = 0
        player['questionsAnswered'] = 0
        player['correctAnswers'] = 0
        player['incorrectAnswers'] = 0
        player['skippedAnswers'] = 0
    
    socketio.emit('update_players', room['players'], to=room_code)
    send_question(room_code)

@socketio.on('host_next_question')
def handle_host_next_question(data):
    sid = request.sid
    room_code = data.get('roomCode')
    room = rooms.get(room_code)
    
    if not room or room['hostId'] != sid:
        return

    room['currentQuestionIndex'] += 1
    
    if room['currentQuestionIndex'] < len(room['gameQuestions']):
        send_question(room_code)
    else:
        end_game(room_code)

# --- PLAYER EVENTS ---
@socketio.on('player_join')
def handle_player_join(data):
    sid = request.sid
    name = data.get('name')
    room_code = data.get('roomCode')
    
    print(f"Player join attempt: {name} -> {room_code}")
    
    room = rooms.get(room_code)
    if not room:
        emit('error_msg', "Invalid Room Code")
        return
    if room['status'] != 'LOBBY':
        emit('error_msg', "Game already in progress")
        return
    
    # Check for duplicate names
    existing = next((p for p in room['players'] if p['name'] == name), None)
    if existing:
        emit('error_msg', "Name taken in this room")
        return

    player = {
        'id': sid,
        'name': name,
        'score': 0,
        'totalResponseTime': 0,
        'questionsAnswered': 0,
        'correctAnswers': 0,
        'incorrectAnswers': 0,
        'skippedAnswers': 0
    }
    room['players'].append(player)
    join_room(room_code)

    emit('player_joined_success', {'roomCode': room_code, 'name': name})
    socketio.emit('update_players', room['players'], to=room_code)
    print(f"{name} joined {room_code}")

@socketio.on('player_submit_answer')
def handle_player_submit_answer(data):
    sid = request.sid
    room_code = data.get('roomCode')
    answer_index = data.get('answerIndex')
    
    room = rooms.get(room_code)
    if not room or room['status'] != 'QUESTION_ACTIVE':
        return

    # Only accept first answer
    if sid not in room['answers']:
        room['answers'][sid] = answer_index
        if answer_index != -1:
            room['answerTimes'][sid] = time.time() * 1000
        
        # Emit answer progress to all players
        answered_count = len(room['answers'])
        total_players = len(room['players'])
        all_answered = answered_count == total_players and total_players > 0
        
        socketio.emit('answer_progress', {
            'answeredCount': answered_count,
            'totalPlayers': total_players,
            'allAnswered': all_answered
        }, to=room_code)
        
        print(f"Answer progress: {answered_count}/{total_players} answered")

@socketio.on('skip_to_results')
def handle_skip_to_results(data):
    sid = request.sid
    room_code = data.get('roomCode')
    room = rooms.get(room_code)
    
    if not room or room['hostId'] != sid:
        return
    
    # Stop timer and immediately finish round
    room['timer_stop'] = True
    print(f"Host skipped to results - all players answered")
    finish_round(room_code)

# --- RECONNECTION HANDLERS ---
@socketio.on('host_reconnect')
def handle_host_reconnect(data):
    sid = request.sid
    room_code = data.get('roomCode')
    room = rooms.get(room_code)
    
    if not room:
        emit('error_msg', 'Game session expired')
        print(f'Host reconnect failed: room {room_code} not found')
        return
    
    # Update host ID to new session (this prevents cleanup)
    print(f'Host reconnecting: old ID was {room["hostId"]}, new ID is {sid}')
    room['hostId'] = sid
    
    # Rejoin room
    join_room(room_code)
    
    # Send current game state back
    emit('host_reconnected', {
        'roomCode': room_code,
        'status': room['status'],
        'players': room['players'],
        'currentQuestionIndex': room['currentQuestionIndex'],
        'totalQuestions': len(room['gameQuestions'])
    })
    
    print(f"Host successfully reconnected to {room_code}")

@socketio.on('player_reconnect')
def handle_player_reconnect(data):
    sid = request.sid
    room_code = data.get('roomCode')
    player_name = data.get('name')
    
    print(f'Player reconnect attempt: {player_name} to room {room_code}')
    
    room = rooms.get(room_code)
    if not room:
        emit('error_msg', 'Game session expired')
        print(f'Player reconnect failed: room {room_code} not found')
        return
    
    # Find player by name and update their ID
    player = next((p for p in room['players'] if p['name'] == player_name), None)
    if not player:
        emit('error_msg', 'Player not found in game')
        print(f'Player reconnect failed: {player_name} not in player list. Players: {[p["name"] for p in room["players"]]}')
        return
    
    # Update player ID to new session (this prevents cleanup)
    old_id = player['id']
    print(f'Player {player_name} reconnecting: old ID was {old_id}, new ID is {sid}')
    player['id'] = sid
    
    # Update answers and times dicts if they exist
    if old_id in room['answers']:
        room['answers'][sid] = room['answers'].pop(old_id)
    if old_id in room['answerTimes']:
        room['answerTimes'][sid] = room['answerTimes'].pop(old_id)
    
    # Rejoin room
    join_room(room_code)
    
    # Send current game state back
    emit('player_reconnected', {
        'roomCode': room_code,
        'status': room['status'],
        'playerData': player
    })
    
    # Update all clients with new player list
    socketio.emit('update_players', room['players'], to=room_code)
    
    print(f"Player {player_name} successfully reconnected to {room_code}")

def send_question(room_code):
    room = rooms.get(room_code)
    if not room:
        return

    room['status'] = 'QUESTION_ACTIVE'
    room['answers'] = {}
    room['answerTimes'] = {}
    room['questionStartTime'] = time.time() * 1000
    
    question = room['gameQuestions'][room['currentQuestionIndex']]
    print(f"Sending question {room['currentQuestionIndex'] + 1}/{len(room['gameQuestions'])}")
    
    if not question:
        return
    
    question_payload = {
        'index': room['currentQuestionIndex'],
        'total': len(room['gameQuestions']),
        'text': question['text'],
        'options': question['options'],
        'time': QUESTION_TIME
    }

    socketio.emit('new_question', question_payload, to=room_code)

    # Start Timer in background thread
    def timer_countdown():
        time_left = QUESTION_TIME
        room['timer_stop'] = False
        
        while time_left > 0 and not room.get('timer_stop', False):
            socketio.emit('timer_tick', time_left, to=room_code)
            time.sleep(1)
            time_left -= 1
            
        if not room.get('timer_stop', False):
            finish_round(room_code)
    
    room['timer_stop'] = True
    time.sleep(0.1)  # Give time for old timer to stop
    
    room['timer_thread'] = threading.Thread(target=timer_countdown)
    room['timer_thread'].daemon = True
    room['timer_thread'].start()

def finish_round(room_code):
    room = rooms.get(room_code)
    if not room:
        return

    room['status'] = 'ROUND_ENDED'
    
    current_q = room['gameQuestions'][room['currentQuestionIndex']]
    correct_index = current_q['correct']

    player_results = []
    correct_answerers = []
    
    for player in room['players']:
        answer = room['answers'].get(player['id'])
        answer_time = room['answerTimes'].get(player['id'])
        response_time = None
        
        if answer_time and room['questionStartTime']:
            response_time = (answer_time - room['questionStartTime']) / 1000
        
        if answer is None or answer == -1:
            player['skippedAnswers'] += 1
        elif answer == correct_index:
            player['score'] += SCORE_CORRECT
            player['correctAnswers'] += 1
            correct_answerers.append({'player': player, 'responseTime': response_time})
            if response_time is not None:
                player['totalResponseTime'] += response_time
                player['questionsAnswered'] += 1
        else:
            player['score'] += SCORE_WRONG
            player['incorrectAnswers'] += 1
        
        player_results.append({
            'id': player['id'],
            'name': player['name'],
            'score': player['score'],
            'answer': answer,
            'responseTime': response_time,
            'isCorrect': answer == correct_index,
            'isSkipped': answer is None or answer == -1,
            'totalResponseTime': player['totalResponseTime'],
            'questionsAnswered': player['questionsAnswered'],
            'correctAnswers': player['correctAnswers'],
            'incorrectAnswers': player['incorrectAnswers'],
            'skippedAnswers': player['skippedAnswers']
        })
    
    # Sort correct answerers by response time
    correct_answerers.sort(key=lambda x: x['responseTime'] or float('inf'))
    
    # Award speed bonuses
    for index, item in enumerate(correct_answerers):
        if item['responseTime'] is not None:
            speed_bonus = 0
            if index == 0:
                speed_bonus = 10
            elif index == 1:
                speed_bonus = 5
            elif index == 2:
                speed_bonus = 2
            
            item['player']['score'] += speed_bonus
            
            for result in player_results:
                if result['id'] == item['player']['id']:
                    result['score'] = item['player']['score']
                    result['speedBonus'] = speed_bonus
                    result['rank'] = index + 1
                    break

    fastest_correct = correct_answerers[0] if correct_answerers else None
    total_answered = len([p for p in room['players'] if room['answers'].get(p['id']) is not None])
    correct_answer_count = len(correct_answerers)
    average_response_time = (sum(item['responseTime'] or 0 for item in correct_answerers) / len(correct_answerers)) if correct_answerers else 0

    socketio.emit('round_result', {
        'correctIndex': correct_index,
        'players': room['players'],
        'playerResults': player_results,
        'fastestCorrect': {
            'name': fastest_correct['player']['name'],
            'responseTime': fastest_correct['responseTime']
        } if fastest_correct else None,
        'roundStats': {
            'totalPlayers': len(room['players']),
            'totalAnswered': total_answered,
            'correctAnswers': correct_answer_count,
            'averageResponseTime': average_response_time
        }
    }, to=room_code)
    
    # Auto-advance if in auto mode
    if room.get('gameMode') == 'auto':
        auto_delay = room.get('autoDelay', 5)
        print(f"Auto-advancing to next question in {auto_delay} seconds")
        
        def auto_advance():
            time.sleep(auto_delay)
            if room_code in rooms:  # Check room still exists
                room['currentQuestionIndex'] += 1
                if room['currentQuestionIndex'] < len(room['gameQuestions']):
                    send_question(room_code)
                else:
                    end_game(room_code)
        
        auto_thread = threading.Thread(target=auto_advance)
        auto_thread.daemon = True
        auto_thread.start()

def end_game(room_code):
    room = rooms.get(room_code)
    if not room:
        return
    
    room['status'] = 'GAME_OVER'
    socketio.emit('game_over', {'players': room['players']}, to=room_code)

if __name__ == '__main__':
    PORT = int(os.environ.get('PORT', 3000))
    print(f"Server running on port {PORT}")
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True, allow_unsafe_werkzeug=True)
