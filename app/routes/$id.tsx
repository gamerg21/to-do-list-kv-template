import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/cloudflare";
import { useLoaderData, Form } from "@remix-run/react";
import { TodoManager } from "~/to-do-manager";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((col) => (
            <div key={col.key} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">{col.label}</h2>
              <ul className="space-y-2">
                {(todosByColumn[col.key] || []).map((todo) => (
                  <li key={todo.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Form method="post" className="flex items-center gap-2 flex-1">
                      <input type="hidden" name="id" value={todo.id} />
                      <input
                        type="checkbox"
                        name="completed"
                        checked={todo.completed}
                        onChange={() => {}}
                        onClick={e => {
                          e.currentTarget.form?.requestSubmit();
                        }}
                        className="accent-blue-500 h-4 w-4"
                        aria-label="Mark complete"
                      />
                      <button
                        type="submit"
                        name="intent"
                        value="toggle"
                        className="flex-1 text-left"
                        style={{ background: "none", border: "none", padding: 0 }}
                        tabIndex={-1}
                      >
                        <span className={todo.completed ? "line-through text-gray-400" : ""}>{todo.text}</span>
                      </button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="id" value={todo.id} />
                      <button
                        type="submit"
                        name="intent"
                        value="delete"
                        className="text-red-500 hover:text-red-700"
                        aria-label="Delete"
                      >
                        Delete
                      </button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="id" value={todo.id} />
                      <select
                        name="column"
                        defaultValue={todo.column}
                        onChange={e => e.currentTarget.form?.requestSubmit()}
                        className="ml-2 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-sm"
                        aria-label="Move to column"
                      >
                        {COLUMNS.map(opt => (
                          <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                      </select>
                      <input type="hidden" name="intent" value="move" />
                    </Form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
