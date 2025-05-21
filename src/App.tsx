import '@/App.css';

import type { components } from '@octokit/openapi-types';
import { useEffect, useState } from 'react';

import { Modal } from '@/shared/components/modal';
import { octokit } from '@/shared/lib/git-octokit';
import { supabase } from '@/shared/lib/supa-client';

type Issue = components['schemas']['issue'];
type newIss = Pick<Issue, 'title' | 'body' | 'assignees' | 'labels' | 'number'>;

export function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [modalItem, setModalItem] = useState<newIss | null>(null);

  // prettier-ignore
  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from("demo-kanban")
      .select("*")
      .order("number", { ascending: false });
      
    if (error) return console.error(error);

    setIssues(data);
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // const createIssue = async () => {
  //   const res = await octokit.rest.issues.create({
  //     owner: 'revy7289',
  //     repo: 'demo-kanban-supabase-with-github',
  //     title: 'test create',
  //     body: 'test body',
  //   });

  //   console.log(res);
  // };

  const createIssue = () => {
    setModalItem({
      title: '',
      body: '',
      assignees: [],
      labels: [],
      number: 0,
    });
  };

  const getIssues = async () => {
    const res = await octokit.rest.issues.listForRepo({
      owner: 'revy7289',
      repo: 'demo-kanban-supabase-with-github',
    });

    console.log(res);
    setIssues(res.data);
  };

  return (
    <div className="flex flex-col items-center gap-[10px] p-[20px]">
      <button onClick={createIssue}>생성 테스트</button>
      <button onClick={getIssues}>페치 테스트</button>

      <ul className="flex flex-col gap-[8px] rounded-[8px] bg-[#dbdbdb] px-[50px] py-[20px]">
        {issues.map((item) => (
          <li
            key={item.id}
            className="flex gap-[8px] rounded-[4px] bg-[#f5f5f5] px-[8px] py-[4px]"
            onClick={() => setModalItem(item)}
          >
            <p className="font-semibold">#{item.number}</p>
            <p>{item.title}</p>
          </li>
        ))}
      </ul>

      {modalItem && (
        <Modal item={modalItem} setModal={setModalItem} setIssues={setIssues} />
      )}
    </div>
  );
}
