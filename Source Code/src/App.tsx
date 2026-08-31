import { useEffect, useState } from "react";
import { Pin, RotateCcw, Star, Trash2, GripVertical } from "lucide-react";
import "./App.css";

import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

type Note = {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  starred: boolean;
  deletedAt: number | null;
  order: number;
};

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Welcome to JustNotes!",
    content: "Here you can see documentation and examples of how to use JustNotes.",
    pinned: false,
    starred: false,
    deletedAt: null,
    order: 0,
  },
];

function loadNotes(): Note[] {
  const savedNotes = localStorage.getItem("justnotes-notes");

  if (!savedNotes) {
    return initialNotes;
  }

  try {
    const parsedNotes: Note[] = JSON.parse(savedNotes);

    return parsedNotes.map((note, index) => ({
      ...note,
      order: note.order ?? index,
      starred: note.starred ?? false,
    }));
  } catch (error) {
    return initialNotes;
  }
}

type Filter = "all" | "starred" | "trash";

function SortableNote({
  note,
  selectedNoteId,
  filter,
  onSelect,
  onTogglePinned,
}: {
  note: Note;
  selectedNoteId: number;
  filter: Filter;
  onSelect: (id: number) => void;
  onTogglePinned: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };



  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`note-card-wrapper ${
        note.id === selectedNoteId ? "active" : ""
      }`}
    >
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
      >

      <GripVertical 
        size={16}
        strokeWidth={1.8} 
      />
      </button>

      <button
        className="note-card"
        onClick={() => onSelect(note.id)}
      >
        <strong>{note.title || "Untitled"}</strong>
        <span>{note.content || "Empty note"}</span>
      </button>

      {filter !== "trash" && (
        <button
          className={`pin-button ${
            note.pinned ? "pinned" : ""
          }`}
          onClick={() => onTogglePinned(note.id)}
        > 
          <Pin
            size={16}
            strokeWidth={1.8}
            fill={note.pinned ? "currentColor" : "none"}
          />
        </button>
      )}
    </div>
  );
}

function App() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(1);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    localStorage.setItem("justnotes-notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.ctrlKey) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        changeFilter("all");
      }

      if (event.key === "2") {
        event.preventDefault();
        changeFilter("starred");
      }

      if (event.key === "3") {
        event.preventDefault();
        changeFilter("trash");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [notes]);

  const selectedNote = notes.find(
    (note) => note.id === selectedNoteId
  );

  const visibleNotes = (
    filter === "trash"
      ? notes.filter((note) => note.deletedAt !== null)
      : filter === "starred"
        ? notes.filter(
          (note) =>
            note.starred &&
            note.deletedAt === null
        )
      : notes.filter((note) => note.deletedAt === null)
  ).sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
        
    return a.order - b.order;
  });

  function changeFilter(newFilter: Filter) {
    setFilter(newFilter);

    const nextNote = 
      newFilter === "trash"
        ? notes.find((note) => note.deletedAt !== null)
        : newFilter === "starred"
          ? notes.find(
            (note) =>
              note.starred &&
              note.deletedAt === null
          )
          : notes.find(
            (note) => note.deletedAt === null
          )

    setSelectedNoteId(nextNote?.id ?? 0);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleNotes.findIndex(
      (note) => note.id === active.id
    );

    const newIndex = visibleNotes.findIndex(
      (note) => note.id === over.id
    );

    const reorderedNotes = arrayMove(
      visibleNotes,
      oldIndex,
      newIndex
    );

    setNotes((currentNotes) =>
      currentNotes.map((note) => {
        const index = reorderedNotes.findIndex(
          (reorderedNote) => reorderedNote.id === note.id
        );

        if (index === -1) {
          return note;
        }

        return {
          ...note,
          order: index,
        };
      })
    );
  }

  function createNote() {
    const newNote: Note = {
      id: Date.now(),
      title: "Untitled",
      content: "",
      pinned: false,
      starred: false,
      deletedAt: null,
      order: 0,
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
            onClick={() => changeFilter("all")}
          >
            All notes
          </button>

          <button
            className={`nav-item ${
              filter === "starred" ? "active" : ""
            }`}
            onClick={() => changeFilter("starred")}
          >
            Starred
          </button>

          <button
            className={`nav-item ${
              filter === "trash" ? "active" : ""
            }`}
            onClick={() => changeFilter("trash")}
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
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext
        items={visibleNotes.map((note) => note.id)}
        strategy={verticalListSortingStrategy}
      >
        {visibleNotes.length > 0 ? (
          visibleNotes.map((note) => (
            <SortableNote
              key={note.id}
              note={note}
              selectedNoteId={selectedNoteId}
              filter={filter}
              onSelect={setSelectedNoteId}
              onTogglePinned={togglePinned}
            />
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
      </SortableContext>
    </DndContext>
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