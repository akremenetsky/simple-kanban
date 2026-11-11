import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { Board } from '@kanban/shared';
import { useBoards, useCreateBoard, useDeleteBoard, useRenameBoard } from '../api/boards.js';
import { Button } from '../components/Button.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Icon } from '../components/Icon.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { useDocumentTitle } from '../useDocumentTitle.js';
import styles from './BoardsPage.module.css';

export function BoardsPage() {
  useDocumentTitle('Boards');
  const boards = useBoards();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Board | null>(null);
  const deleteBoard = useDeleteBoard();

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>Boards</h1>
        {!creating && (boards.data?.length ?? 0) > 0 && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Icon name="plus" />
            New board
          </Button>
        )}
      </div>

      {boards.isPending && <p className={styles.muted}>Loading…</p>}
      {boards.isError && <p className={styles.muted}>Couldn’t load boards. Is the API running?</p>}

      {boards.isSuccess && boards.data.length === 0 && !creating && (
        <div className={styles.empty}>
          <p>No boards yet.</p>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Icon name="plus" />
            Create your first board
          </Button>
        </div>
      )}

      {boards.isSuccess && (boards.data.length > 0 || creating) && (
        <ul className={styles.grid} aria-label="Boards">
          {boards.data.map((board) => (
            <BoardTile key={board.id} board={board} onDelete={() => setToDelete(board)} />
          ))}
          {creating && <NewBoardTile onDone={() => setCreating(false)} />}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete board “${toDelete.title}”?`}
          confirmLabel="Delete board"
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteBoard.mutate(toDelete.id);
            setToDelete(null);
          }}
        >
          All its lists and cards will be deleted too. This can’t be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}

function BoardTile({ board, onDelete }: { board: Board; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const rename = useRenameBoard();

  return (
    <li className={styles.tile}>
      {editing ? (
        <InlineEdit
          value={board.title}
          ariaLabel="Board title"
          className={styles.tileInput}
          onSave={(title) => rename.mutate({ id: board.id, title })}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <Link to={`/boards/${board.id}`} className={styles.tileLink}>
            {board.title}
          </Link>
          <div className={styles.tileActions}>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Rename board ${board.title}`}
              title="Rename"
              onClick={() => setEditing(true)}
            >
              <Icon name="pencil" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Delete board ${board.title}`}
              title="Delete"
              onClick={onDelete}
            >
              <Icon name="trash" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

function NewBoardTile({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const create = useCreateBoard();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    create.mutate(value, {
      onSuccess: () => {
        setTitle('');
        onDone();
      },
    });
  };

  return (
    <li className={`${styles.tile} ${styles.newTile}`}>
      <form className={styles.newForm} onSubmit={submit}>
        <input
          className={styles.newInput}
          placeholder="Board title"
          aria-label="New board title"
          value={title}
          maxLength={200}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onDone()}
        />
        <div className={styles.newActions}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!title.trim() || create.isPending}
          >
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </li>
  );
}
