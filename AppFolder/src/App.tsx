import { useState } from "react";
import { Pin } from "lucide-react";
import "./App.css";

type Note = {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
};

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Welcome to JustNotes!",
    content: "This is your first note.",
    pinned: false,
  },
];

type Filter = "all" | "pinned";

function App() {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(1);
  const [filter, setFilter] = useState<Filter>("all");

  const selectedNote = notes.find(
    (note) => note.id === selectedNoteId
  );

  const visibleNotes =
    filter === "pinned"
      ? notes.filter((note) => note.pinned)
      : notes;

  function createNote() {
    const newNote: Note = {
      id: Date.now(),
      title: "Untitled",
      content: "",
      pinned: false,
    };

    setNotes((currentNotes) => [newNote, ...currentNotes]);
    setSelectedNoteId(newNote.id);
    setFilter("all");
  }

  function updateSelectedNote(
    field: "title" | "content",
    value: string
  ) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === selectedNoteId
          ? { ...note, [field]: value }
          : note
      )
    );
  }

  function togglePinned(id: number) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id
          ? { ...note, pinned: !note.pinned }
          : note
      )
    );
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>JustNotes</h1>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${
              filter === "all" ? "active" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            All notes
          </button>

          <button
            className={`nav-item ${
              filter === "pinned" ? "active" : ""
            }`}
            onClick={() => setFilter("pinned")}
          >
            Pinned
          </button>
        </nav>

        <button
          className="new-note-button"
          onClick={createNote}
        >
          New note
        </button>
      </aside>

      <section className="notes-list">
        <h2>
          {filter === "all" ? "Notes" : "Pinned"}
        </h2>

        {visibleNotes.length > 0 ? (
          visibleNotes.map((note) => (
            <div
              key={note.id}
              className={`note-card-wrapper ${
                note.id === selectedNoteId ? "active" : ""
              }`}
            >
              <button
                className="note-card"
                onClick={() => setSelectedNoteId(note.id)}
              >
                <strong>
                  {note.title || "Untitled"}
                </strong>

                <span>
                  {note.content || "Empty note"}
                </span>
              </button>

              <button
                className={`pin-button ${
                  note.pinned ? "pinned" : ""
                }`}
                onClick={() => togglePinned(note.id)}
                aria-label={
                  note.pinned ? "Unpin note" : "Pin note"
                }
                title={
                  note.pinned ? "Unpin note" : "Pin note"
                }
              > 
                <Pin
                  size={16}
                  strokeWidth={1.8}
                  fill={note.pinned ? "currentColor" : "none"}
                />
              </button>
            </div>
          ))
        ) : (
          <p className="empty-message">
            No pinned notes
          </p>
        )}
      </section>

      <section className="editor">
        {selectedNote ? (
          <>
            <div className="editor-toolbar">
              <button
                className={`editor-pin-button ${
                  selectedNote.pinned ? "pinned" : ""
                }`}
                onClick={() => togglePinned(selectedNote.id)}
                aria-label={
                  selectedNote.pinned ? "Unpin note" : "Pin note"
                }
                title={
                  selectedNote.pinned ? "Unpin note" : "Pin note"
                }
              >
                <Pin
                  size={18}
                  strokeWidth={1.8}
                  fill={selectedNote.pinned ? "currentColor" : "none"}
                />
              </button>
            </div>

            <input
              className="note-title"
              value={selectedNote.title}
              onChange={(event) =>
                updateSelectedNote("title", event.target.value)
              }
              placeholder="Untitled"
              aria-label="Note title"
            />

            <textarea
              className="note-content"
              value={selectedNote.content}
              onChange={(event) =>
                updateSelectedNote("content", event.target.value)
              }
              placeholder="What's on your mind today?"
              aria-label="Note content"
            />
          </>
        ) : (
          <p>No note selected</p>
        )}
      </section>
    </main>
  );
}

export default App;