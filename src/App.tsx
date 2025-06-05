import '@/App.css';

import type { components } from '@octokit/openapi-types';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { Modal } from '@/shared/components/modal';
import { supabase } from '@/shared/lib/supa-client';

type Issue = components['schemas']['issue'];
type newIss = Pick<Issue, 'title' | 'body' | 'assignees' | 'labels' | 'number'>;

export function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [modalItem, setModalItem] = useState<newIss | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('demo-kanban')
      .select('*')
      .order('number', { ascending: false });

    if (error) return console.error('이슈 가져오기 실패');
    console.log(data);

    setIssues(data);
  };

  const fetchUser = async () => {
    const { data: session } = await supabase.auth.getSession();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(session.session?.access_token);

    if (error) return console.error('로그인 해주세요');
    console.log(user);
    // console.log(session.session?.access_token);

    setUser(user);
  };

  const useOAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return console.error('로그아웃 오류 있어요');
    setUser(null);
  };

  const openChannel = () => {
    const channel = supabase
      .channel('realtime-kanban')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo-kanban' },
        (payload) => {
          console.log('Realtime Change:', payload);

          setIssues((prev) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...prev, payload.new];

              case 'UPDATE':
                return prev.map((item) =>
                  item.id === payload.new.id ? payload.new : item
                );

              case 'DELETE':
                return prev.filter((item) => item.id !== payload.old.id);

              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    fetchUser();
    fetchIssues();
    openChannel();
  }, []);

  const createIssue = () => {
    setModalItem({
      title: '',
      body: '',
      assignees: [],
      labels: [],
      number: 0,
    });
  };

  return (
    <div className="flex flex-col items-center gap-[10px] p-[20px]">
      {user === null ? (
        <button onClick={useOAuth}>로그인</button>
      ) : (
        <>
          <p>
            Welcome, {user.user_metadata?.user_name || user.user_metadata?.name}
          </p>
          <button onClick={signOut}>로그아웃</button>
          <button onClick={createIssue}>생성 테스트</button>
          {/* <button onClick={getIssues}>페치 테스트</button> */}

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
            <Modal
              item={modalItem}
              setModal={setModalItem}
              setIssues={setIssues}
            />
          )}
        </>
      )}
    </div>
  );
}
