import { useCallback, useLayoutEffect } from "react";
import { Check, XMark, LoopIcon } from "./Icon";
import Button from "./Button";
import classnames from "classnames";
import { useState } from "react";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { useAppDispatch, useAppSelector } from "@/store";
import { setTodoList } from "@/store/features/todoListSlice";
import { shine } from "../utils/confetti";

export const ItemTypes = {
  TODO_ITEM: "todoItem",
};

export type TodoItemDataType = {
  value: string;
  checked: boolean;
  date: number;
  id: string; // use value + Date.now() as unique key
};

type TodoItemProps = TodoItemDataType & {
  sortMark: number;
  find: (id: TodoItemDataType["id"]) => DragItemType;
  move: (id: TodoItemDataType["id"], toIndex: number) => void;
};

type DragItemType = { item: TodoItemDataType } & { index: number };

const checkExpired = (date: number) => {
  const today = new Date().setHours(0, 0, 0, 0);

  return date < today;
};

const TodoItem = ({
  id,
  value,
  date,
  checked,
  sortMark,
  find,
  move,
}: TodoItemProps) => {
  const { todoList } = useAppSelector((state) => state.todoList);
  const dispatch = useAppDispatch();

  const originalIndex = find(id).index;
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.TODO_ITEM,
      item: { id, originalIndex },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: (item, monitor) => {
        const { id: droppedId, originalIndex } = item;
        const didDrop = monitor.didDrop();

        // 恢复原位
        if (!didDrop) {
          move(droppedId, originalIndex);
        }
      },
    }),
    [id, originalIndex, move]
  );

  const [, drop] = useDrop(
    () => ({
      accept: ItemTypes.TODO_ITEM,
      hover({ id: draggedId }: TodoItemDataType) {
        if (draggedId !== id) {
          const { index: overIndex } = find(id);
          move(draggedId, overIndex);
        }
      },
    }),
    [find, move]
  );

  const onDelete = (id: string) => {
    dispatch(setTodoList(todoList.filter((item, index) => item.id !== id)));
  };

  const onChangeStats = (id: string) => {
    // TODO if all checked, show firework
    const result = [...todoList];
    const index = result.findIndex((item) => item.id === id);

    const newStatus = !result[index].checked;

    if (newStatus) {
      shine();
    }

    result[index] = {
      ...result[index],
      checked: newStatus,
    };

    dispatch(setTodoList(result));
  };

  const isExpired = checkExpired(date);

  const opacity = isDragging ? 0 : 1;

  return (
    <div
      className="w-full flex justify-between rounded-lg bg-black text-red-400 p-2 font-bold transform"
      style={{ opacity }}
      ref={(node) => drag(drop(node))}
    >
      <div className="flex justify-start flex-auto truncate">
        <div className="font-bold pr-2">{sortMark + 1}.</div>
        <div
          className={classnames(
            "font-bold  truncate",
            checked ? "line-through" : undefined
          )}
        >
          {value}
        </div>
      </div>
      {/* TODO change animation */}
      <div className="pl-4 flex justify-end flex-none">
        {isExpired && <div className="pr-2">E</div>}
        {checked ? (
          <LoopIcon onClick={() => onChangeStats(id)} />
        ) : (
          <Check onClick={() => onChangeStats(id)} />
        )}
        <XMark onClick={() => onDelete(id)} />
      </div>
    </div>
  );
};

const TodoList = () => {
  const { todoList } = useAppSelector((state) => state.todoList);
  const dispatch = useAppDispatch();

  const find = useCallback(
    (id: TodoItemDataType["id"]) => {
      const curItem = todoList.find((c) => `${c.id}` === id)!;

      return {
        item: curItem,
        index: todoList.indexOf(curItem!),
      };
    },
    [todoList]
  );

  const move = useCallback(
    (id: TodoItemDataType["id"], toIndex: number) => {
      const { item: curItem, index } = find(id);

      const newTodoList = [...todoList];
      newTodoList.splice(index, 1);
      newTodoList.splice(toIndex, 0, curItem);

      dispatch(setTodoList(newTodoList));
    },
    [dispatch, find, todoList]
  );

  const [, drop] = useDrop(() => ({ accept: ItemTypes.TODO_ITEM }));

  // 初始化时清除过期且完成的 todo
  useLayoutEffect(() => {
    const validTodoList = todoList.filter((item) => {
      const { checked, date } = item;
      const isExpired = checkExpired(date);
      return !(isExpired && checked);
    });

    console.log(validTodoList);

    dispatch(setTodoList(validTodoList));
  }, []);

  return (
    <div className="w-10/12 flex flex-col space-y-4" ref={drop}>
      {todoList?.map((item, index) => (
        <TodoItem
          {...item}
          key={item.id}
          sortMark={index}
          find={find}
          move={move}
        />
      ))}
    </div>
  );
};

const AddLine = () => {
  const [value, onChange] = useState("");

  const { todoList } = useAppSelector((state) => state.todoList);
  const dispatch = useAppDispatch();

  const onAdd = () => {
    if (!value) {
      return;
    }

    const date = Date.now();
    const item = {
      checked: false,
      value,
      date,
      id: value + "+" + date,
    };

    dispatch(setTodoList([...todoList, item]));
    onChange("");
  };

  return (
    <div className="flex space-x-4 w-10/12">
      <input
        className="rounded-lg shadow-md flex-1 px-4 py-2 font-bold focus:outline-red-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button className="text-red-400" onClick={onAdd}>
        ADD
      </Button>
    </div>
  );
};

const Todo = () => {
  const { visible } = useAppSelector((state) => state.todoList);

  return (
    <div
      className={classnames(
        visible ? "w-1/2" : "w-0",
        "w-1/2 h-full flex flex-col justify-center items-center duration-300 bg-red-400 space-y-4"
      )}
    >
      <AddLine />
      <DndProvider backend={HTML5Backend}>
        <TodoList />
      </DndProvider>
    </div>
  );
};

export default Todo;
