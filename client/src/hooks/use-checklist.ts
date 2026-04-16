import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "../firebase";

// 실시간으로 목록 불러오기
export function subscribeChecklist(callback: (list: any[]) => void) {
  return onValue(ref(db, "checklists"), (snapshot) => {
    const data = snapshot.val();
    if (!data) return callback([]);
    const list = Object.entries(data).map(([id, val]: any) => ({
      id,
      ...val,
    }));
    callback(list);
  });
}

// 항목 추가
export function addItem(title: string) {
  return push(ref(db, "checklists"), {
    title,
    done: false,
    createdAt: new Date().toISOString(),
  });
}

// 완료 처리
export function toggleItem(id: string, done: boolean) {
  return update(ref(db, `checklists/${id}`), { done });
}

// 삭제
export function deleteItem(id: string) {
  return remove(ref(db, `checklists/${id}`));
}
