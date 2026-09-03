import { useEffect, useState } from "react";
import { 
        Pin,
        RotateCcw,
        Star,
        Trash2,
        GripVertical,
        Settings as SettingsIcon,
        PenLine,
        Files,
        ChevronLeft,
        ChevronRight,
        FileText,
       } from "lucide-react";

import "./App.css";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

import {
  check,
  type Update,
} from "@tauri-apps/plugin-updater";
import { relaunch} from "@tauri-apps/plugin-process";

import { BubbleMenu } from "@tiptap/react/menus"

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
  updatedAt: number;
};

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Welcome to JustNotes!",
    content: `
      <p>Welcome to <strong>JustNotes</strong> — a simple place for your thoughts, ideas, and plans.</p>

      <p><strong>Getting started</strong></p>

      <ul>
        <li><p>Create a note using the <strong>new note</strong> button.</p></li>
        <li><p>Pin notes to keep them at the top of the list.</p></li>
        <li><p>Add important notes to <strong>Starred</strong>.</p></li>
        <li><p>Select text to make it bold, italic, or underlined.</p></li>
        <li><p>Deleted notes can be restored from the Deleted tab.</p></li>
      </ul>

      <p><strong>Keyboard shortcuts</strong></p>

      <p>
      Ctrl + 1 — All notes<br>
      Ctrl + 2 — Starred<br>
      Ctrl + 3 — Deleted
      </p>

      <li>
        <p>
          Personalize JustNotes with eight themes in
          <strong>Settings</strong>. Blueberry Dark, Darling,
          Purpleish, and Bouquet are inspired by color palettes
          from <strong>monkeytype.com</strong>.
        </p>
      </li>

      <p>That's all you need. Create your first note and make JustNotes yours!</p>

      <p>p.s.:
      <em> Спасибо за то, что пользуетесь JustNotes! </em><br> 
      <code> ♡ with love::Misa ♡ <code><br>
      <em> Мой телеграм: @JavaTheGod </em>
      </p>
    `,
    pinned: false,
    starred: false,
    deletedAt: null,
    order: 0,
    updatedAt: Date.now()
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
      updatedAt: note.updatedAt ?? Date.now(),
    }));
  } catch (error) {
    return initialNotes;
  }
}

function getPlainText(html: string): string {
  const element = document.createElement("div");
  element.innerHTML = html;

  return element.textContent || element.innerText || "";
}

function formatUpdatedAt(updatedAt: number): string {
  const updatedDate = new Date(updatedAt);
  const today = new Date();

  if (updatedDate.toDateString() === today.toDateString()) {
    return "Modified today";
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (
    updatedDate.toDateString() === yesterday.toDateString()
  ) {
    return "Modified yesterday";
  }

  return `Modified ${updatedDate.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )}`;
}

type Filter = "all" | "starred" | "trash" | "settings";

type Theme =
  | "dark"
  | "light"
  | "mocha"
  | "nord"
  | "blueberry-dark"
  | "darling"
  | "purpleish"
  | "bouquet";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "upToDate"
  | "error";

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
        <span>
          {getPlainText(note.content).trim()
            ? formatUpdatedAt(note.updatedAt)
            : "empty note"}
        </span>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState< "idle" | "saving" | "saved" > ("idle") 


  const selectedNote = notes.find(
    (note) => note.id === selectedNoteId
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: "What's on your mind today?",
      }),
    ],
    content: selectedNote?.content  ?? "",
    onUpdate: ({ editor }) => {
      if (!selectedNote) {
        return;
      }

      updateSelectedNote("content", editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || !selectedNote) {
      return;
    }

    if (editor.getHTML() !== selectedNote.content) {
      editor.commands.setContent(selectedNote.content || "");
    }
  }, [selectedNoteId, editor]);

  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("justnotes-theme");
    
    if (
      savedTheme === "light" ||
      savedTheme === "mocha" ||
      savedTheme === "nord" ||
      savedTheme === "blueberry-dark" ||
      savedTheme === "darling" ||
      savedTheme === "purpleish" ||
      savedTheme === "bouquet"
    ) {
      return savedTheme;
    }

    return "dark";
  });

  const [
    confirmPermanentDelete,
    setConfirmPermanentDelete,
  ] = useState(() => {
    const savedValue = localStorage.getItem(
      "justnotes-confirm-permanent-delete"
    );

    return savedValue === null
      ? true
      : savedValue === "true";
  });

  const [pendingDeleteId, setPendingDeleteId] =
    useState<number | null>(null);

  const [availableUpdate, setAvailableUpdate] =
    useState<Update | null>(null);

  const [updateStatus, setUpdateStatus] =
    useState<UpdateStatus>("idle");

  useEffect(() => {
    localStorage.setItem("justnotes-theme", theme);

    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "justnotes-confirm-permanent-delete",
      String(confirmPermanentDelete)
    );
  }, [confirmPermanentDelete]);

  useEffect(() => {
    localStorage.setItem(
      "justnotes-notes",
      JSON.stringify(notes)
    );

    if (saveStatus !== "saving") {
      return;
    }

    const savedTimeout = window.setTimeout(() => {
      setSaveStatus("saved");
    }, 800);

    return () => {
      window.clearTimeout(savedTimeout);
    };
  }, [notes]);

  useEffect(() => {
    if (saveStatus !== "saved") {
      return;
    }

    const idleTimeout = window.setTimeout(() => {
      setSaveStatus("idle");
    }, 1600);

    return () => {
      window.clearTimeout(idleTimeout);
    };
  }, [saveStatus]);

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

  async function handleUpdate() {
    try {
      if (availableUpdate) {
        setUpdateStatus("downloading");

        await availableUpdate.downloadAndInstall();
        await relaunch();
        return;
      }

      setUpdateStatus("checking");

      const update = await check();

      if (update) {
        setAvailableUpdate(update);
        setUpdateStatus("available");
      } else {
        setUpdateStatus("upToDate");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setUpdateStatus("error");
    }
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
      updatedAt: Date.now()
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

  function permanentlyRemoveNote(id:number) {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== id)
    );

    const nextDeletedNote = notes.find(
      (note) =>
        note.id !== id &&
        note.deletedAt !== null
    );

    setSelectedNoteId(nextDeletedNote?.id ?? 0);
  }

  function deleteForever(id:number) {
    if (confirmPermanentDelete) {
      setPendingDeleteId(id);
      return;
    }

    permanentlyRemoveNote(id);
  }

  function confirmDeleteForever() {
    if (pendingDeleteId === null) {
      return;
    }

    permanentlyRemoveNote(pendingDeleteId);
    setPendingDeleteId(null);
  }


  function updateSelectedNote(
    field: "title" | "content",
    value: string
  ) {
    setSaveStatus("saving")

    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === selectedNoteId
          ? {
              ...note,
              [field]: value,
              updatedAt: Date.now(),
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

  const updateButtonText =
    updateStatus === "checking"
      ? "Checking..."
      : updateStatus === "downloading"
        ? "Installing..."
        : updateStatus === "available"
          ? `Install ${availableUpdate?.version}`
          : updateStatus === "upToDate"
            ? "You're up to date"
            : updateStatus === "error"
              ? "Try again"
              : "Check for updates";


  return (
    <main 
    className={`app ${
      sidebarCollapsed ? "sidebar-collapsed" : ""
    }`}
  >
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>JustNotes</h1>

          <button
            className="sidebar-toggle"
            onClick={() =>
              setSidebarCollapsed(!sidebarCollapsed)
            }
          >
            {sidebarCollapsed ? (
              <ChevronRight size={23} strokeWidth={1.8} />
            ) : (
              <ChevronLeft size={23} strokeWidth={1.8} />
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${
              filter === "all" ? "active" : ""
            }`}
            onClick={() => changeFilter("all")}
          >
            <Files size={17} strokeWidth={1.8} />
            <span>All notes</span>
          </button>

          <button
            className={`nav-item ${
              filter === "starred" ? "active" : ""
            }`}
            onClick={() => changeFilter("starred")}
          >
            <Star size={17} strokeWidth={1.8} />
            <span>Starred</span>
          </button>

          <button
            className={`nav-item ${
              filter === "trash" ? "active" : ""
            }`}
            onClick={() => changeFilter("trash")}
          >
            <Trash2 size={17} strokeWidth={1.8} />
            <span>Deleted</span>
          </button>
        </nav>

        <div className="side-bar-footer">
          <button
            className={`settings-button ${
              filter === "settings" ? "active" : ""
            }`}
            onClick={() => changeFilter("settings")}
          >
            <SettingsIcon size={18} strokeWidth={1.8} />
            <span>Settings</span>
          </button>

          <button
            className="new-note-button"
            onClick={createNote}
          >
            <PenLine size={17} strokeWidth={1.8} />
            <span>new note </span>
          </button>
        </div>
      </aside>

      {filter === "settings" ? (
        <section className="settings">
          <div className="settings-container">
            <header className="settings-header">
              <h1>Settings</h1>
              <p>Customize your JustNotes experience.</p>
            </header>

          <div className="settings-group">
            <h2>Appearance</h2>

            <div className="theme-setting">
              <div className="theme-setting-heading">
                <strong>Theme</strong>
                <span>Choose a color palette for JustNotes!</span>
              </div>

              <div className="theme-options">
                <button
                  className={`theme-option dark${
                    theme === "dark" ? " active" : ""
                  }`}
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">Dark</span>
                </button>

                <button
                  className={`theme-option light${
                    theme === "light" ? " active" : ""
                  }`}
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                
                  <span className="theme-option-name">Light</span>  
                </button>

                <button
                  className={`theme-option mocha${
                    theme === "mocha" ? " active" : ""
                  }`}
                  onClick={() => setTheme("mocha")}
                  aria-pressed={theme === "mocha"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">Coffee</span>
                </button>

                <button
                  className={`theme-option nord${
                    theme === "nord" ? " active" : ""
                  }`}
                  onClick={() => setTheme("nord")}
                  aria-pressed={theme === "nord"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">Nord</span>
                </button>

                <button
                  className={`theme-option blueberry-dark${
                    theme === "blueberry-dark" ? " active" : ""
                  }`}
                  onClick={() => setTheme("blueberry-dark")}
                  aria-pressed={theme === "blueberry-dark"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">
                    Blueberry Dark
                  </span>
                </button>

                <button
                  className={`theme-option purpleish${
                    theme === "purpleish" ? " active" : ""
                  }`}
                  onClick={() => setTheme("purpleish")}
                  aria-pressed={theme === "purpleish"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">
                    Purpleish
                  </span>
                </button>

                <button
                  className={`theme-option bouquet${
                    theme === "bouquet" ? " active" : ""
                  }`}
                  onClick={() => setTheme("bouquet")}
                  aria-pressed={theme === "bouquet"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">
                    Bouquet
                  </span>
                </button>

                <button
                  className={`theme-option darling${
                    theme === "darling" ? " active" : ""
                  }`}
                  onClick={() => setTheme("darling")}
                  aria-pressed={theme === "darling"}
                >
                  <span className="theme-option-colors">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>

                  <span className="theme-option-name">
                    Darling
                  </span>
                </button>
              </div>
              </div>
            </div>
            <div className="settings-group">
              <h2>General</h2>

              <div className="settings-row">
                <div className="settings-row-text">
                  <strong>Confirm permanent deletion</strong>
                  <span>Ask before permanently deleting a note.</span>
                </div>

                <button
                  className={`settings-switch ${
                    confirmPermanentDelete ? "active" : ""
                  }`}
                  onClick={() =>
                    setConfirmPermanentDelete(
                      !confirmPermanentDelete
                    )
                  }
                  role="switch"
                  aria-checked={confirmPermanentDelete}
                >
                  <span className="settings-switch-thumb" />
                </button>
              </div>
            </div>
            <div className="settings-group settings-about">
              <h2>About</h2>

              <div className="settings-row">
                <div className="settings-row-text">
                  <strong>JustNotes</strong>

                  <span>
                    {updateStatus === "available"
                      ? `Version ${availableUpdate?.version} is available.`
                      : updateStatus === "downloading"
                        ? "installing the update..."
                        : updateStatus === "upToDate"
                          ? "Latest version is already installed!"
                          : updateStatus === "error"
                            ? "Couldn't check for updates :("
                            : "Version 0.1.0"}
                  </span>
                </div>

                <button
                  className="update-button"
                  onClick={handleUpdate}
                  disabled={
                    updateStatus === "checking" ||
                    updateStatus === "downloading" ||
                    updateStatus === "upToDate"
                  }
                >
                  {updateButtonText}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>

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
              <div
                className={`save-status ${saveStatus}`}
                role="status"
                aria-live="polite"
              >
                <span>
                  {saveStatus === "saving"
                    ? "Saving..."
                    : "Saved locally"}
                </span>

                <FileText size={14} strokeWidth={1.8 } />
              </div>
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

            
              {editor && (
                <BubbleMenu editor={editor}>
                  <div className="format-menu">
                    <button
                      className={editor.isActive("bold") ? "is-active" : ""}
                      onClick={() => 
                        editor.chain().focus().toggleBold().run()
                      }
                    >
                      B
                    </button>
                    <button
                      className={editor.isActive("italic") ? "is-active" : ""}
                      onClick={() =>
                        editor.chain().focus().toggleItalic().run()
                      }
                    >
                      I
                    </button>
                    <button
                      className={editor.isActive("underline") ? "is-active" : ""}
                      onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                      }
                    >
                      U
                    </button>

                    <button
                      className={editor.isActive("strike") ? "is-active" : ""}
                      onClick={() =>
                        editor.chain().focus().toggleStrike().run()
                      }
                    >
                      S
                    </button>
                  </div>
                </BubbleMenu>
              )}

              <EditorContent
                editor={editor}
                className="note-content"
              />
            </>
          ) : (
            <div className="empty-editor-message">
              <div className="empty-note-preview" aria-hidden="true">
                <span className="empty-note-title-line"></span>
                <span className="empty-note-text-line"></span>
                <span className="empty-note-text-line-short"></span>
                <span className="empty-note-text-line-shorter"></span>
              </div>

              <div className="empty-editor-text">
                <h2>Nothing to see here</h2>
                <p>Select a note from the sidebar or create a new one.</p>
              </div>
            </div>
          )}
        </section>
      </>
      )}

    {pendingDeleteId !== null && (
      <div
        className="modal-backdrop"
        onClick={() => setPendingDeleteId(null)}
      >
        <div
          className="delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="delete-modal-header">
            <div className="delete-modal-icon">
              <Trash2 size={18} strokeWidth={1.8} />
            </div>

            <div>
              <h2 id="delete-modal-title">
                You sure u want delete this note?
              </h2>
              <p>This action <strong>cannot</strong> be undone!</p>
            </div>
          </div>

          <div className="delete-modal-actions">
              <button
              className="modal-delete-button"
              onClick={confirmDeleteForever}
              >
                Delete forever (A long time!)
              </button>

              <button
              className="modal-cancel-button"
              onClick={() => setPendingDeleteId(null)}
              >
                No! Cancel
              </button>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;