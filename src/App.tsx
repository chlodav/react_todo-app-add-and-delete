/* eslint-disable jsx-a11y/control-has-associated-label */
/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import classNames from 'classnames';
import { UserWarning } from './UserWarning';
import { Todo } from './types/Todo';
import { getTodos, addTodo, deleteTodo } from './api/todos';

type FilterType = 'all' | 'active' | 'completed';

const getUserId = (): number => {
  try {
    const user = localStorage.getItem('user');

    return user ? JSON.parse(user).id : 0;
  } catch {
    return 0;
  }
};

const USER_ID = getUserId();

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((message: string) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    setErrorMessage(message);
    errorTimerRef.current = setTimeout(() => setErrorMessage(''), 3000);
  }, []);

  useEffect(() => {
    getTodos(USER_ID)
      .then(setTodos)
      .catch(() => showError('Unable to load todos'));
  }, [showError]);

  useEffect(() => {
    if (!isInputDisabled) {
      inputRef.current?.focus();
    }
  }, [isInputDisabled]);

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const completedTodos = todos.filter(t => t.completed);

  const setInputDisabled = (disabled: boolean) => {
    setIsInputDisabled(disabled);

    if (inputRef.current) {
      inputRef.current.disabled = disabled;
    }
  };

  const beginAddTodo = (trimmedTitle: string) => {
    if (isInputDisabled) {
      return;
    }

    flushSync(() => {
      setInputDisabled(true);
      setTempTodo({
        id: 0,
        userId: USER_ID,
        title: trimmedTitle,
        completed: false,
      });
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }

    setErrorMessage('');

    const trimmedTitle = (inputRef.current?.value || newTodoTitle).trim();

    if (!trimmedTitle) {
      showError('Title should not be empty');

      return;
    }

    beginAddTodo(trimmedTitle);

    addTodo({ userId: USER_ID, title: trimmedTitle, completed: false })
      .then(created => {
        window.setTimeout(() => {
          setTodos(prev => [...prev, created]);
          setTempTodo(null);
          setNewTodoTitle('');
          setInputDisabled(false);
        }, 0);
      })
      .catch(() => {
        showError('Unable to add a todo');
        window.setTimeout(() => {
          setTempTodo(null);
          setInputDisabled(false);
        }, 0);
      });
  };

  const handleDelete = (id: number) => {
    setLoadingIds(prev => [...prev, id]);

    deleteTodo(id)
      .then(() => {
        window.setTimeout(() => {
          setTodos(prev => prev.filter(t => t.id !== id));
          setLoadingIds(prev => prev.filter(loadingId => loadingId !== id));
          inputRef.current?.focus();
        }, 0);
      })
      .catch(() => {
        showError('Unable to delete a todo');
        window.setTimeout(() => {
          setLoadingIds(prev => prev.filter(loadingId => loadingId !== id));
          inputRef.current?.focus();
        }, 0);
      });
  };

  const handleClearCompleted = () => {
    completedTodos.forEach(todo => handleDelete(todo.id));
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: todos.every(t => t.completed),
              })}
              data-cy="ToggleAllButton"
            />
          )}

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const trimmedTitle = e.currentTarget.value.trim();

                  if (trimmedTitle) {
                    beginAddTodo(trimmedTitle);
                  }
                }
              }}
              disabled={isInputDisabled}
            />
          </form>
        </header>

        {(todos.length > 0 || tempTodo) && (
          <section className="todoapp__main">
            {filteredTodos.map(todo => (
              <div
                key={todo.id}
                data-cy="Todo"
                className={classNames('todo', { completed: todo.completed })}
              >
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={todo.completed}
                    readOnly
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {todo.title}
                </span>

                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  onClick={() => handleDelete(todo.id)}
                >
                  ×
                </button>

                <div
                  data-cy="TodoLoader"
                  className={classNames('modal overlay', {
                    'is-active': loadingIds.includes(todo.id),
                  })}
                >
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            ))}

            {tempTodo && (
              <div key="temp" data-cy="Todo" className="todo">
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={false}
                    readOnly
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {tempTodo.title}
                </span>

                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                >
                  ×
                </button>

                <div data-cy="TodoLoader" className="modal overlay is-active">
                  <div className="modal-background has-background-white-ter" />
                  <div className="loader" />
                </div>
              </div>
            )}
          </section>
        )}

        {todos.length > 0 && (
          <footer className="todoapp__footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeCount} {activeCount === 1 ? 'item' : 'items'} left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                data-cy="FilterLinkAll"
                className={classNames('filter__link', {
                  selected: filter === 'all',
                })}
                onClick={e => {
                  e.preventDefault();
                  setFilter('all');
                }}
              >
                All
              </a>

              <a
                href="#/active"
                data-cy="FilterLinkActive"
                className={classNames('filter__link', {
                  selected: filter === 'active',
                })}
                onClick={e => {
                  e.preventDefault();
                  setFilter('active');
                }}
              >
                Active
              </a>

              <a
                href="#/completed"
                data-cy="FilterLinkCompleted"
                className={classNames('filter__link', {
                  selected: filter === 'completed',
                })}
                onClick={e => {
                  e.preventDefault();
                  setFilter('completed');
                }}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={completedTodos.length === 0}
              onClick={handleClearCompleted}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !errorMessage },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => {
            if (errorTimerRef.current) {
              clearTimeout(errorTimerRef.current);
            }

            setErrorMessage('');
          }}
        />
        {errorMessage}
      </div>
    </div>
  );
};
