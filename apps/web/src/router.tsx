import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout.js';
import { BoardPage } from './pages/BoardPage.js';
import { BoardsPage } from './pages/BoardsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <BoardsPage /> },
      { path: 'boards/:boardId', element: <BoardPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
