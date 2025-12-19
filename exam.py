import yaml
import os
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def exam():
    # Load questions from math.yaml
    with open(os.path.join(os.path.dirname(__file__), 'data', 'math.yaml'), 'r', encoding='utf-8') as f:
        questions = yaml.safe_load(f)
    
    print(f"Loaded {len(questions)} questions.")
    return render_template('exam.html', questions=questions)

if __name__ == '__main__':
    app.run(debug=True)