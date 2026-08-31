import { useEffect, useState } from "react";
import { Pin, RotateCcw, Star, Trash2 } from "lucide-react";
import "./App.css";

type Note = {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  starred: boolean;
  deletedAt: number | null;
};

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Welcome to JustNotes!",
    content: "Here you can see documentation and examples of how to use JustNotes.",
    pinned: false,
    starred: false,
    deletedAt: null,
  },
];

function loadNotes(): Note[] {
  const savedNotes = localStorage.getItem("justnotes-notes");

  if (!savedNotes) {
    return initialNotes;
  }

  try {
    return JSON.parse(savedNotes);
  } catch {
    return initialNotes;
  }
}

type Filter = "all" | "starred" | "trash";

function App() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(1);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    localStorage.setItem("justnotes-notes", JSON.stringify(notes));
  }, [notes]);

  const selectedNote = notes.find(
    (note) => note.id === selectedNoteId
  );

  const visibleNotes =
    filter === "trash"
      ? notes.filter((note) => note.deletedAt !== null)
      : filter === "starred"
        ? notes.filter(
            (note) => note.starred && note.deletedAt === null
          )
        : notes.filter((note) => note.deletedAt === null);

  function createNote() {
    const newNote: Note = {
      id: Date.now(),
      title: "Untitled",
      content: "",
      pinned: false,
      starred: false,
      deletedAt: null,
    };

    setNotes((currentNotes) => [newNote, ...currentNotes]);
    setSelectedNoteId(newNote.id);
    setFilter("all");
  }

  function moveToTrash(id: number) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              deletedAt: Date.now(),
              pinned: false,
              starred: false,
            }
          : note
      )
    );

    const nextNote = notes.find(
      (note) =>
        note.id !== id &&
        note.deletedAt === null
    );

    setSelectedNoteId(nextNote?.id ?? 0);
  }

  function restoreNote(id: number) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              deletedAt: null,
              pinned: false,
              starred: false,
            }
          : note
      )
    );

    setFilter("all");
  }

  function deleteForever(id: number) {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== id)
    );

    const nextTrashNote = notes.find(
      (note) =>
        note.id !== id &&
        note.deletedAt !== null
    );

    setSelectedNoteId(nextTrashNote?.id ?? 0);
  }

  function updateSelectedNote(
    field: "title" | "content",
    value: string
  ) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === selectedNoteId
          ? {
              ...note,
              [field]: value,
            }
          : note
      )
    );
  }

  function togglePinned(id: number) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              pinned: !note.pinned,
            }
          : note
      )
    );
  }

  function toggleStarred(id: number) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id
          ? {
              ...note,
              starred: !note.starred,
            }
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
              filter === "starred" ? "active" : ""
            }`}
            onClick={() => setFilter("starred")}
          >
            Starred
          </button>

          <button
            className={`nav-item ${
              filter === "trash" ? "active" : ""
            }`}
            onClick={() => setFilter("trash")}
          >
            Trash
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
          {filter === "all"
            ? "Notes"
            : filter === "starred"
              ? "Starred"
              : "Trash"}
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

              {filter !== "trash" && (
                <button
                  className={`pin-button ${
                    note.pinned ? "pinned" : ""
                  }`}
                  onClick={() => togglePinned(note.id)}
                  aria-label={
                    note.pinned
                      ? "Unpin note"
                      : "Pin note"
                  }
                  title={
                    note.pinned
                      ? "Unpin note"
                      : "Pin note"
                  }
                >
                  <Pin
                    size={16}
                    strokeWidth={1.8}
                    fill={
                      note.pinned
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="empty-message">
            {filter === "trash"
              ? "Trash is empty"
              : filter === "starred"
                ? "No starred notes"
                : "No notes"}
          </p>
        )}
      </section>

      <section className="editor">
        {selectedNote ? (
          <>
            <div className="editor-toolbar">
              {selectedNote.deletedAt !== null ? (
                <>
                  <button
                    className="editor-action-button"
                    onClick={() =>
                      restoreNote(selectedNote.id)
                    }
                    aria-label="Restore note"
                    title="Restore note"
                  >
                    <RotateCcw
                      size={18}
                      strokeWidth={1.8}
                    />
                  </button>

                  <button
                    className="editor-action-button danger"
                    onClick={() =>
                      deleteForever(selectedNote.id)
                    }
                    aria-label="Delete forever"
                    title="Delete forever"
                  >
                    <Trash2
                      size={18}
                      strokeWidth={1.8}
                    />
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`editor-pin-button ${
                      selectedNote.pinned
                        ? "pinned"
                        : ""
                    }`}
                    onClick={() =>
                      togglePinned(selectedNote.id)
                    }
                    aria-label={
                      selectedNote.pinned
                        ? "Unpin note"
                        : "Pin note"
                    }
                    title={
                      selectedNote.pinned
                        ? "Unpin note"
                        : "Pin note"
                    }
                  >
                    <Pin
                      size={18}
                      strokeWidth={1.8}
                      fill={
                        selectedNote.pinned
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                  
                  <button
                    className={`editor-action-button ${
                      selectedNote.starred ? "starred" : ""
                    }`}
                    onClick={() => toggleStarred(selectedNote.id)}
                    aria-label={
                      selectedNote.starred
                        ? "Remove from starred"
                        : "Add to starred"
                    }
                    title={
                      selectedNote.starred
                        ? "Remove from starred"
                        : "Add to starred"
                    }
                  >
                    <Star
                      size={18}
                      strokeWidth={1.8}
                      fill={
                        selectedNote.starred
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>

                  <button
                    className="editor-action-button"
                    onClick={() =>
                      moveToTrash(selectedNote.id)
                    }
                    aria-label="Move to trash"
                    title="Move to trash"
                  >
                    <Trash2
                      size={18}
                      strokeWidth={1.8}
                    />
                  </button>
                </>
              )}
            </div>

            <input
              className="note-title"
              value={selectedNote.title}
              onChange={(event) =>
                updateSelectedNote(
                  "title",
                  event.target.value
                )
              }
              placeholder="Untitled"
              aria-label="Note title"
            />

            <textarea
              className="note-content"
              value={selectedNote.content}
              onChange={(event) =>
                updateSelectedNote(
                  "content",
                  event.target.value
                )
              }
              placeholder="What's on your mind today?"
              aria-label="Note content"
            />
          </>
        ) : (
          <div className="empty-editor-message">
            <h1> Select a note </h1>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;