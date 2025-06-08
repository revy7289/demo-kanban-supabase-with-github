import { Dispatch, FormEvent, SetStateAction, useState } from 'react';

import { kanbanItem, supaDB } from '../types/issues';

type SetState<T> = Dispatch<SetStateAction<T>>;

interface ModalProps {
  item: kanbanItem;
  token: string | undefined;
  setModal: SetState<kanbanItem | null>;
  setIssues: SetState<supaDB[]>;
}

export function Modal({ item, token, setModal, setIssues }: ModalProps) {
  const [loading, setLoading] = useState(false);
  console.log(item);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const isNew = item.number === 0;

    const payload = {
      owner: 'revy7289',
      repo: 'demo-kanban-supabase-with-github',
      idx: isNew ? '' : item.number,

      action: isNew ? 'create' : 'update',
      issue: {
        title: formData.get('title'),
        body: formData.get('body'),
        assignees: ['revy7289', 'Seono-Na'],
      },
    };

    try {
      const response = await fetch(
        'https://xycjubkmnosvnkfrslxu.supabase.co/functions/v1/github-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const issue = await response.json();
      console.log(issue);

      setIssues((prev) =>
        isNew
          ? [issue.data, ...prev]
          : prev.map((item) =>
              item.number === issue.data.number
                ? { ...item, ...issue.data }
                : item
            )
      );

      setModal(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && setModal(null)}
    >
      <form
        className="flex h-[520px] w-[800px] flex-col gap-[20px] rounded-[8px] bg-white p-[20px]"
        onSubmit={handleSubmit}
      >
        <h1 className="bg-[#ffdbdb] p-[8px] text-[24px] font-semibold">
          {item.team}
        </h1>

        <label className="flex w-full flex-col gap-[8px]">
          <p>제목</p>
          <input
            className="h-[40px] w-full rounded-[8px] bg-[#f5f5f5] px-[12px] py-[8px]"
            type="text"
            defaultValue={item.title}
            name="title"
          />
        </label>

        <label className="flex w-full flex-col gap-[8px]">
          <p>상세 내용</p>
          <textarea
            className="h-[200px] w-full resize-none rounded-[8px] bg-[#f5f5f5] px-[12px] py-[8px]"
            defaultValue={String(item.body)}
            name="body"
          ></textarea>
        </label>

        {item.team === '전체' || item.team === 'FE' || item.team === 'BE' ? (
          <button
            className="h-[36px] w-[224px] rounded-[8px] bg-[#0065FF] text-white duration-200 hover:bg-black disabled:bg-black"
            type="submit"
            disabled={loading}
          >
            {loading ? '처리 중...' : '테스트'}
          </button>
        ) : null}
      </form>
    </div>
  );
}
