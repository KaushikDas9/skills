import sqlite3
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
db = sqlite3.connect("notes.db", check_same_thread=False)
db.execute("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT)")


@app.route("/notes", methods=["POST"])
def add_note():
    text = request.json["text"]
    db.execute("INSERT INTO notes (text) VALUES (?)", (text,))
    db.commit()
    return jsonify(ok=True)


@app.route("/notes")
def list_notes():
    rows = db.execute("SELECT id, text FROM notes").fetchall()
    return jsonify(rows)


@app.route("/quote")
def quote():
    try:
        r = requests.get("https://api.quotable.example/random")
        return jsonify(r.json())
    except:
        pass
    return jsonify(quote="")


if __name__ == "__main__":
    app.run()
