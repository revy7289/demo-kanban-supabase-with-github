import '@/App.css';

import { User } from '@supabase/supabase-js';
import { useState } from 'react';

import { supabase } from '@/shared/lib/supa-client';

import { Publish } from './shared/components/publish';
import { E_Team } from './shared/constants/kanban';
import { kanbanItem, supaDB } from './shared/types/issues';

export function App() {
  const [issues, setIssues] = useState<supaDB[]>([]);
  const [modalItem, setModalItem] = useState<kanbanItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | undefined>('');

  const fetchIssues = async () => {
    const { data, error } = await supabase
      .from('demo-kanban')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return console.error('이슈 가져오기 실패');
    console.log(data);

    setIssues(data);
  };

  const fetchUser = async () => {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session.session?.access_token;

    if (!accessToken) return console.error('토큰이 없습니다');

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) return console.error('로그인 해주세요');
    console.log(user);

    setUser(user);
    setToken(accessToken);
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

  // const openChannel = () => {
  //   const channel = supabase
  //     .channel('realtime-kanban')
  //     .on(
  //       'postgres_changes',
  //       { event: '*', schema: 'public', table: 'demo-kanban' },
  //       (payload: RealtimePostgresChangesPayload<supaDB>) => {
  //         console.log('Realtime Change:', payload);

  //         setIssues((prev) => {
  //           switch (payload.eventType) {
  //             case 'INSERT':
  //               return [...prev, payload.new];

  //             case 'UPDATE':
  //               const updated = payload.new;
  //               const others = prev.filter(
  //                 (item) => item.sb_id !== updated.sb_id
  //               );
  //               return [updated, ...others];

  //             case 'DELETE':
  //               return prev.filter((item) => item.sb_id !== payload.old.sb_id);

  //             default:
  //               return prev;
  //           }
  //         });
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // };

  // useEffect(() => {
  //   // fetchUser();
  //   // fetchIssues();
  //   openChannel();
  // }, []);

  const createIssue = (team: E_Team) => () => {
    setModalItem({
      title: '',
      body: '',
      assignees: ['revy7289', 'Seono-Na'],
      labels: [],
      number: 0,
      team,
    });
  };

  const teamList = Object.values(E_Team);

  return (
    <>
      <Publish />
      {/* {teamList.map((team) => (
        <div
          key={team + 'kanban'}
          className="flex flex-col items-center gap-[10px] p-[20px]"
        >
          {user === null ? (
            <button onClick={useOAuth}>로그인</button>
          ) : (
            <>
              <h1>{team}</h1>
              <p>
                Welcome,{' '}
                {user.user_metadata?.user_name || user.user_metadata?.name}
              </p>
              <button onClick={signOut}>로그아웃</button>
              <button onClick={createIssue(team)}>생성 테스트</button>

              <ul className="flex flex-col gap-[8px] rounded-[8px] bg-[#dbdbdb] px-[50px] py-[20px]">
                {issues.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-[8px] rounded-[4px] bg-[#f5f5f5] px-[8px] py-[4px]"
                    onClick={() => setModalItem({ ...item, team })}
                  >
                    <p className="font-semibold">#{item.number}</p>
                    <p>{item.title}</p>
                  </li>
                ))}
              </ul>

              {modalItem?.team === team && (
                <Modal
                  item={modalItem}
                  token={token}
                  setModal={setModalItem}
                  setIssues={setIssues}
                />
              )}
            </>
          )}
        </div>
      ))} */}
    </>
  );
}
