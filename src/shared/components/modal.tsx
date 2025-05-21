import { components } from '@octokit/openapi-types';
import { FormEvent, useState } from 'react';

type Issue = components['schemas']['issue'];
type newIss = Pick<Issue, 'title' | 'body' | 'assignees' | 'labels' | 'number'>;

export function Modal({
  item,
  setModal,
  setIssues,
}: {
  item: Issue | newIss;
  setModal: React.Dispatch<React.SetStateAction<newIss | null>>;
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
}) {
  const [loading, setLoading] = useState(false);

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
      },
    };

    try {
      const response = await fetch(
        'https://xycjubkmnosvnkfrslxu.supabase.co/functions/v1/github-webhook',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

        <button
          className="h-[36px] w-[224px] rounded-[8px] bg-[#0065FF] text-white duration-200 hover:bg-black disabled:bg-black"
          type="submit"
          disabled={loading}
        >
          {loading ? '처리 중...' : '테스트'}
        </button>
      </form>
    </div>
  );
}
