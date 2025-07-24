import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/cloudflare";
import { useLoaderData, Form, useFetcher } from "@remix-run/react";
import { TodoManager } from "~/to-do-manager";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { CheckIcon } from '@heroicons/react/24/solid'; // You may need to install @heroicons/react or use an inline SVG

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const todoManager = new TodoManager(
    context.cloudflare.env.TO_DO_LIST,
    params.id,
  );
  const todosByColumn = await todoManager.listByColumn();
  return { todosByColumn };
};

export async function action({ request, context, params }: ActionFunctionArgs) {
  const todoManager = new TodoManager(
    context.cloudflare.env.TO_DO_LIST,
    params.id,
  );
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create": {
      const text = formData.get("text");
      if (typeof text !== "string" || !text)
        return Response.json({ error: "Invalid text" }, { status: 400 });
      await todoManager.create(text);
      return { success: true };
    }
    case "toggle": {
      const id = formData.get("id") as string;
      await todoManager.toggle(id);
      return { success: true };
    }
    case "delete": {
      const id = formData.get("id") as string;
      await todoManager.delete(id);
      return { success: true };
    }
    case "move": {
      const id = formData.get("id") as string;
      const column = formData.get("column") as "todo" | "in progress" | "in review";
      await todoManager.moveToColumn(id, column);
      return { success: true };
    }
    default:
      return Response.json({ error: "Invalid intent" }, { status: 400 });
  }
}

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in progress", label: "In Progress" },
  { key: "in review", label: "In Review" },
];

export default function () {
  const { todosByColumn } = useLoaderData<typeof loader>();
  const moveFetcher = useFetcher();

  // Helper to flatten todos for Draggable
  const getTodos = (colKey: string) => todosByColumn[colKey] || [];

  // Handler for drag end
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination, source } = result;
    if (destination.droppableId !== source.droppableId) {
      moveFetcher.submit(
        {
          id: draggableId,
          column: destination.droppableId,
          intent: "move",
        },
        { method: "post" }
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
          Todo List
        </h1>
        <Form method="post" className="mb-8 flex gap-2">
          <input
            type="text"
            name="text"
            className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm px-4 py-2"
            placeholder="Add a new todo..."
          />
          <button
            type="submit"
            name="intent"
            value="create"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Add
          </button>
        </Form>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 min-h-[200px] transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                  >
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">{col.label}</h2>
                    <ul className="space-y-2">
                      {getTodos(col.key).map((todo, idx) => (
                        <Draggable draggableId={todo.id} index={idx} key={todo.id}>
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 transition-shadow duration-200 ${snapshot.isDragging ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900' : ''}`}
                              style={{ ...provided.draggableProps.style, boxShadow: snapshot.isDragging ? '0 2px 8px rgba(0,0,0,0.15)' : undefined }}
                            >
                              {/* Drag handle (≡ icon) */}
                              <span
                                {...provided.dragHandleProps}
                                className="cursor-grab text-gray-400 hover:text-gray-600 px-2 text-xl select-none"
                                aria-label="Drag to move"
                              >
                                ≡
                              </span>
                              {/* Task text */}
                              <span className={`flex-1 ${todo.completed ? "line-through text-gray-400" : ""}`}>{todo.text}</span>
                              {/* Complete button (checkmark icon) */}
                              <Form method="post">
                                <input type="hidden" name="id" value={todo.id} />
                                <input type="hidden" name="intent" value="toggle" />
                                <button
                                  type="submit"
                                  className={`text-green-500 hover:text-green-700 p-1 rounded ${todo.completed ? 'bg-green-100 dark:bg-green-900' : ''}`}
                                  aria-label="Mark complete"
                                  disabled={todo.completed}
                                >
                                  {/* Inline SVG for checkmark if heroicons not available */}
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                </button>
                              </Form>
                              {/* Delete button (X) */}
                              <Form method="post" className="ml-1">
                                <input type="hidden" name="id" value={todo.id} />
                                <button
                                  type="submit"
                                  name="intent"
                                  value="delete"
                                  className="text-red-500 hover:text-red-700 text-lg font-bold px-2"
                                  aria-label="Delete"
                                  style={{ lineHeight: 1 }}
                                >
                                  ×
                                </button>
                              </Form>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
