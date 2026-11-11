import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/http.js';
import type { List } from '@kanban/shared';
import { useBoard, useDeleteBoard, useRenameBoard } from '../api/boards.js';
import { useCreateList, useDeleteList, useLists, useRenameList } from '../api/lists.js';
import { AddListForm } from '../components/AddListForm.js';
import { Button } from '../components/Button.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { Icon } from '../components/Icon.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { ListColumn } from '../components/ListColumn.js';
import { useDocumentTitle } from '../useDocumentTitle.js';
import styles from './BoardPage.module.css';

export function BoardPage() {
  const { boardId = '' } = useParams();
  const board = useBoard(boardId);
  const rename = useRenameBoard();
  const deleteBoard = useDeleteBoard();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useDocumentTitle(board.data?.title);

  if (board.isPending) return <p className={styles.status}>Loading…</p>;

  if (board.isError) {
    const notFound =
      board.error instanceof ApiError && (board.error.status === 404 || board.error.status === 400);
    return (
      <div className={styles.status}>
        <p>{notFound ? 'This board doesn’t exist.' : 'Couldn’t load the board.'}</p>
        <Link to="/">Back to boards</Link>
      </div>
    );
  }

  const { data } = board;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <Link to="/" className={styles.back} aria-label="Back to boards" title="Back to boards">
          <Icon name="arrowLeft" />
        </Link>
        {editing ? (
          <h1 className={styles.title}>
            <InlineEdit
              value={data.title}
              ariaLabel="Board title"
              onSave={(title) => rename.mutate({ id: data.id, title })}
              onDone={() => setEditing(false)}
            />
          </h1>
        ) : (
          <h1 className={styles.title}>
            <button
              className={styles.titleButton}
              title="Click to rename"
              onClick={() => setEditing(true)}
            >
              {data.title}
            </button>
          </h1>
        )}
        <Button
          variant="ghost"
          iconOnly
          aria-label="Delete board"
          title="Delete board"
          onClick={() => setConfirming(true)}
        >
          <Icon name="trash" />
        </Button>
      </div>

      <BoardLists boardId={data.id} />

      {confirming && (
        <ConfirmDialog
          title={`Delete board “${data.title}”?`}
          confirmLabel="Delete board"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            // Leave first so the page doesn't refetch the board it is deleting.
            navigate('/');
            deleteBoard.mutate(data.id);
          }}
        >
          All its lists and cards will be deleted too. This can’t be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}

function BoardLists({ boardId }: { boardId: string }) {
  const lists = useLists(boardId);
  const createList = useCreateList(boardId);
  const renameList = useRenameList(boardId);
  const deleteList = useDeleteList(boardId);
  const [toDelete, setToDelete] = useState<List | null>(null);

  if (lists.isPending) return <p className={styles.status}>Loading lists…</p>;
  if (lists.isError) return <p className={styles.status}>Couldn’t load lists.</p>;

  return (
    <div className={styles.canvas}>
      {lists.data.map((list) => (
        <ListColumn
          key={list.id}
          list={list}
          onRename={(title) => renameList.mutate({ id: list.id, title })}
          onDelete={() => setToDelete(list)}
        />
      ))}
      <AddListForm
        pending={createList.isPending}
        onCreate={(title, done) => createList.mutate(title, { onSuccess: done })}
      />

      {toDelete && (
        <ConfirmDialog
          title={`Delete list “${toDelete.title}”?`}
          confirmLabel="Delete list"
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            deleteList.mutate(toDelete.id);
            setToDelete(null);
          }}
        >
          All its cards will be deleted too. This can’t be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
