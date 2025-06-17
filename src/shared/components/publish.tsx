import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Fragment, useEffect, useState } from 'react';

import { E_Team, netteeMembers, netteeRepo } from '../constants/kanban';
import { supabase } from '../lib/supa-client';
import { GroupedIssues, IssueData, KanbanStatus } from '../types/issues';

const sidebarList = ['project', 'team', 'assignee', 'label', 'more'];
const projectList = ['전체', 'Blolet', 'Kanban', 'Demo'];
const dummyLabels = [
  '보류',
  '낮음',
  '보통',
  '보통',
  '높음',
  '높음',
  '매우 높음',
];

const initialAccordionMap = (): Record<string, boolean> => {
  const initSidebar = Object.fromEntries(
    sidebarList.map((item) => [`sidebar-${item}`, true])
  );

  const initKanban = Object.fromEntries(
    projectList
      .filter((item) => item !== '전체')
      .map((item) => [`kanban-${item}`, true])
  );

  return {
    ...initSidebar,
    ...initKanban,
  };
};

export function Publish() {
  // 필터 선택
  const [selectedProject, setSelectedProject] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  // 아코디언 토글
  const [accordionMap, setAccordionMap] = useState(initialAccordionMap);

  // 데이터 캐싱

  // 전체 이슈 및 모달 프롭용
  // const [issues, setIssues] = useState();
  // const [modalItem, setModalItem] = useState();

  const teamList = Object.values(E_Team);
  const kanbanTeam = teamList.filter((team) => team !== '전체');
  const kanbanProject = projectList.filter((proj) => proj !== '전체');

  const memberList = Object.values(netteeMembers).flat();
  const teamMembers = selectedTeam.includes('전체')
    ? memberList
    : selectedTeam.flatMap((team) => netteeMembers[team]);

  // 슈퍼베이스 실시간 통신용 채널 오픈 + 페이로드 가공하여 신규상태로 갱신
  const openChannel = () => {
    const channel = supabase
      .channel('realtime-kanban')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload: RealtimePostgresChangesPayload<IssueData>) => {
          console.log('Realtime Change:', payload);

          const newIssue = {
            ...payload.new,
            project: { name: payload.new.project_name }, // 혹은 이미 있음
            team: { name: payload.new.team_name },
          } as IssueData;

          const project = newIssue.project.name;
          const team = newIssue.team.name;
          const progress = (newIssue.progress ?? 'TODO') as KanbanStatus;

          setGroupedIssues((prev) => {
            const next = structuredClone(prev);

            // 초기화 방지
            if (!next[project]) next[project] = {};
            if (!next[project][team]) {
              next[project][team] = {
                TODO: [],
                DOING: [],
                DONE: [],
                CHECKED: [],
              };
            }

            const teamIssues = next[project][team];

            switch (payload.eventType) {
              case 'INSERT': {
                teamIssues[progress].push(newIssue);
                break;
              }

              case 'UPDATE': {
                // 1. 모든 상태를 순회하면서 기존 이슈 제거
                for (const status of [
                  'TODO',
                  'DOING',
                  'DONE',
                  'CHECKED',
                ] as KanbanStatus[]) {
                  teamIssues[status] = teamIssues[status].filter(
                    (item) => item.sb_id !== newIssue.sb_id
                  );
                }
                // 2. 새 progress로 push
                teamIssues[progress].push(newIssue);
                break;
              }

              case 'DELETE': {
                for (const status of [
                  'TODO',
                  'DOING',
                  'DONE',
                  'CHECKED',
                ] as KanbanStatus[]) {
                  teamIssues[status] = teamIssues[status].filter(
                    (item) => item.sb_id !== payload.old.sb_id
                  );
                }
                break;
              }

              default:
                break;
            }

            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    openChannel();
  }, []);

  const handleProjectToggle = (proj: string) => {
    if (proj === '전체') return setSelectedProject(['전체']);

    setSelectedProject((prev) => {
      const activeProject = prev.includes(proj)
        ? prev.filter((p) => p !== proj) // 중복된 선택 배열에서 튕기기
        : [...prev.filter((p) => p !== '전체'), proj]; // '전체' 없애고 배열 추가

      // 선택 항목이 하나도 없다면 기본값으로 '전체' 선택 유지
      return activeProject.length === 0 ? ['전체'] : activeProject;
    });
  };

  const handleTeamToggle = (team: string) => {
    if (team === '전체') return setSelectedTeam(['전체']);

    setSelectedTeam((prev) => {
      const activeTeam = prev.includes(team)
        ? prev.filter((p) => p !== team) // 중복된 선택 배열에서 튕기기
        : [...prev.filter((p) => p !== '전체'), team]; // '전체' 없애고 배열 추가

      // 선택 항목이 하나도 없다면 기본값으로 '전체' 선택 유지
      return activeTeam.length === 0 ? ['전체'] : activeTeam;
    });
  };

  const handleAccordionToggle = (key: string) => {
    setAccordionMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fetchTableData = async (table: string): Promise<IssueData[]> => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error in table: ${table}`);
      return [];
    }

    return data ?? [];
  };

  const promiseAllIssue = async (): Promise<IssueData[]> => {
    const promiseBuffer: Promise<IssueData[]>[] = [];

    for (const [projectName, teamObj] of Object.entries(netteeRepo)) {
      for (const [teamName, tableList] of Object.entries(teamObj)) {
        for (const tableName of tableList) {
          const promise = fetchTableData(tableName).then((rows) =>
            rows.map((row) => ({
              ...row,
              project: { name: projectName },
              team: { name: teamName },
            }))
          );

          promiseBuffer.push(promise);
        }
      }
    }

    const resolve = await Promise.all(promiseBuffer);
    return resolve.flat();
  };

  const formatIssueByProgress = (data: IssueData[]): GroupedIssues => {
    const result: GroupedIssues = {};

    for (const issue of data) {
      const projectName = issue.project.name;
      const teamName = issue.team.name;
      const progress = (issue.progress ?? 'TODO') as KanbanStatus;

      if (!result[projectName]) result[projectName] = {};
      if (!result[projectName][teamName]) {
        result[projectName][teamName] = {
          TODO: [],
          DOING: [],
          DONE: [],
          CHECKED: [],
        };
      }

      result[projectName][teamName][progress].push(issue);
    }

    return result;
  };

  const [groupedIssues, setGroupedIssues] = useState<GroupedIssues>({});

  useEffect(() => {
    const load = async () => {
      const allIssues = await promiseAllIssue(); // fetch + 메타 주입
      const grouped = formatIssueByProgress(allIssues);
      setGroupedIssues(grouped);
    };
    console.log(groupedIssues);
    load();
  }, []);

  const filteredView = groupedIssues[selectedProject]?.[selectedTeam] ?? {
    TODO: [],
    DOING: [],
    DONE: [],
    CHECKED: [],
  };

  console.log(filteredView);
  console.log(groupedIssues);

  return (
    <main className="flex h-full w-full">
      {/* (aside) 사이드 바 섹션 */}
      <aside className="flex w-[240px] flex-col bg-[#f8f8f8] p-[20px]">
        {/* 로고와 검색창 */}
        <div className="flex flex-col gap-[40px]">
          <h1 className="text-center text-[24px] font-bold">Nettee's KanBan</h1>
          <input
            className="rounded-[4px] border border-[#dbdbdb] bg-white px-[12px] py-[6px]"
            type="search"
            placeholder="검색"
          />
        </div>

        {/* 필터 라벨과 초기화 버튼 */}
        <div className="flex items-center justify-between pt-[20px] pb-[10px]">
          <p className="py-[6px]">필터</p>
          <button
            type="reset"
            className="duration-200 hover:text-[#ff5555]"
            onClick={() => {
              setSelectedProject([]);
              setSelectedTeam([]);
              setAccordionMap(initialAccordionMap);
            }}
          >
            초기화
          </button>
        </div>

        {/* 프로젝트 선택 섹션 */}
        <div className="border-t border-[#dbdbdb] py-[20px]">
          <div className="flex items-center justify-between">
            <p>프로젝트 선택</p>
            <button
              type="button"
              onClick={() => handleAccordionToggle('sidebar-project')}
            >
              {accordionMap['sidebar-project'] ? '▼' : '▲'}
            </button>
          </div>

          <ul
            className={`overflow-hidden pt-[10px] ${accordionMap['sidebar-project'] ? 'h-full' : 'h-0'}`}
          >
            {projectList.map((proj) => (
              <li key={`${proj}_project`} className="px-[8px] py-[6px]">
                <label className="flex items-center gap-[8px]">
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] rounded-[4px]"
                    checked={selectedProject.includes(proj)}
                    onChange={() => handleProjectToggle(proj)}
                  />
                  {proj}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* 팀 선택 섹션 */}
        <div className="border-t border-[#dbdbdb] py-[20px]">
          <div className="flex items-center justify-between">
            <p>팀 선택</p>
            <button
              type="button"
              onClick={() => handleAccordionToggle('sidebar-team')}
            >
              {accordionMap['sidebar-team'] ? '▼' : '▲'}
            </button>
          </div>

          <ul
            className={`overflow-hidden pt-[10px] ${accordionMap['sidebar-team'] ? 'h-full' : 'h-0'}`}
          >
            {teamList.map((team) => (
              <li key={`${team}_team`} className="px-[8px] py-[6px]">
                <label className="flex items-center gap-[8px]">
                  <input
                    type="checkbox"
                    className="h-[18px] w-[18px] rounded-[4px]"
                    checked={selectedTeam.includes(team)}
                    onChange={() => handleTeamToggle(team)}
                  />
                  {team}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* 팀원, 담당자 선택 섹션 */}
        <div className="border-t border-[#dbdbdb] py-[20px]">
          <div className="flex items-center justify-between">
            <p>담당자</p>
            <button
              type="button"
              onClick={() => handleAccordionToggle('sidebar-assignee')}
            >
              {accordionMap['sidebar-assignee'] ? '▼' : '▲'}
            </button>
          </div>

          <div
            className={`flex flex-col overflow-hidden pt-[10px] ${accordionMap['sidebar-assignee'] ? 'h-full' : 'h-0'}`}
          >
            <div className="flex flex-wrap gap-[8px] pt-[8px] pb-[16px]">
              {teamList.map((team) => (
                <button
                  key={`${team}_button`}
                  type="button"
                  className={`flex h-[28px] w-[60px] items-center justify-center rounded-[4px] ${selectedTeam.includes(team) ? 'bg-[#0065FF] text-white' : 'bg-[#ededed]'}`}
                  onClick={() => handleTeamToggle(team)}
                >
                  {team}
                </button>
              ))}
            </div>

            <ul className="h-[306px] w-full overflow-y-scroll">
              {teamMembers.map((member, idx) => (
                <li
                  key={`${idx + member}_assignee`}
                  className="px-[8px] py-[6px]"
                >
                  <label className="flex items-center gap-[8px]">
                    <input
                      type="checkbox"
                      className="h-[18px] w-[18px] rounded-[4px]"
                    />

                    <div className="h-[20px] w-[20px] rounded-full bg-[#dbdbdb]"></div>
                    {member}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 라벨 선택 섹션 */}
        <div className="border-t border-[#dbdbdb] py-[20px]">
          <div className="flex items-center justify-between">
            <p>라벨</p>
            <button
              type="button"
              onClick={() => handleAccordionToggle('sidebar-label')}
            >
              {accordionMap['sidebar-label'] ? '▼' : '▲'}
            </button>
          </div>

          <div
            className={`flex flex-col overflow-hidden pt-[10px] ${accordionMap['sidebar-label'] ? 'h-full' : 'h-0'}`}
          >
            <div className="flex flex-wrap gap-[8px] p-[8px]">
              {dummyLabels.map((label, idx) => (
                <span
                  key={`${idx + label}_label`}
                  className="h-[24px] rounded-full bg-[#ededed] px-[12px] py-[2px]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 링크 섹션 */}
        <div className="border-t border-[#dbdbdb] py-[20px]">
          <div className="flex items-center justify-between">
            <p>보기</p>
            <button
              type="button"
              onClick={() => handleAccordionToggle('sidebar-more')}
            >
              {accordionMap['sidebar-more'] ? '▼' : '▲'}
            </button>
          </div>

          <div
            className={`flex flex-col overflow-hidden pt-[10px] ${accordionMap['sidebar-more'] ? 'h-full' : 'h-0'}`}
          >
            <div className="flex gap-[10px] p-[8px]">
              <span className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] bg-[#ededed] p-[6px] font-bold text-[#0065FF]">
                P
              </span>
              <span className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] bg-[#ededed] p-[6px] font-bold text-[#0065FF]">
                G
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* (section) 프로젝트 단위 전체 칸반 영역 */}
      <section className="flex h-full w-full flex-col gap-[16px] px-[40px] pt-[60px]">
        {kanbanProject.map((project) => (
          <Fragment key={`${project}_kanban`}>
            {/* 프로젝트 라벨과 아코디언 버튼 */}
            <div className="flex items-center justify-between px-[16px] py-[8px] text-[32px] font-bold">
              <h2>{project}</h2>
              <button
                className="mx-[16px] my-[8px] flex h-[32px] w-[32px] items-center justify-center text-[24px]"
                onClick={() => handleAccordionToggle(`kanban-${project}`)}
              >
                {accordionMap[`kanban-${project}`] ? '▼' : '▲'}
              </button>
            </div>

            {/* (article) 팀 단위 개별 칸반 영역 */}
            <div
              className={`flex flex-col gap-[8px] overflow-hidden ${accordionMap[`kanban-${project}`] ? 'h-full' : 'h-0'}`}
            >
              {kanbanTeam.map((team) => (
                <article
                  key={`${team}_kanban`}
                  className="flex flex-col rounded-[8px] bg-[#f5f5f5] p-[16px] font-medium"
                >
                  {/* 팀 라벨과 아코디언 버튼 */}
                  <div className="flex justify-between">
                    <p className="text-[16px] font-semibold">{team}</p>
                    <button
                      type="button"
                      onClick={() =>
                        handleAccordionToggle(`${project}-${team}`)
                      }
                    >
                      {accordionMap[`${project}-${team}`] ? '▼' : '▲'}
                    </button>
                  </div>

                  {/* 칸반이 배치될 영역 */}
                  <div
                    className={`flex flex-wrap gap-[8px] overflow-hidden ${accordionMap[`${project}-${team}`] ? 'mt-[16px] h-full' : 'h-0'}`}
                  >
                    {/* kanban column 1: TODO */}
                    <div className="flex max-h-[860px] min-h-[152px] flex-1 flex-col gap-[12px] overflow-auto bg-[#FFFBDE] p-[12px] pb-[32px]">
                      <div className="flex items-center justify-between px-[8px]">
                        <div className="flex gap-[8px]">
                          <p>TO DO</p>
                          <p className="text-[#F9AA01]">888</p>
                        </div>
                        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] bg-white text-[20px]">
                          +
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-center pb-[8px]">
                        일정이 없습니다.
                      </div>
                    </div>

                    {/* kanban column 2: DOING */}
                    <div className="flex max-h-[860px] min-h-[152px] flex-1 flex-col bg-[#E7F3FE] px-[20px] py-[16px]">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-[8px]">
                          <p>DOING</p>
                          <p className="text-[#1E85E4]">888</p>
                        </div>
                        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] bg-white text-[20px]">
                          +
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-center pb-[8px]">
                        일정이 없습니다.
                      </div>
                    </div>

                    {/* kanban column 3: DONE */}
                    <div className="flex max-h-[860px] min-h-[152px] flex-1 flex-col bg-[#EEFBE6] px-[20px] py-[16px]">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-[8px]">
                          <p>DONE</p>
                          <p className="text-[#58BE1A]">888</p>
                        </div>
                        <div className="flex gap-[8px]">
                          <div className="flex h-[32px] w-[86px] items-center justify-center rounded-[8px] bg-white">
                            전체보기
                          </div>
                          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] bg-white text-[20px]">
                            +
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-center pb-[8px]">
                        일정이 없습니다.
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="my-[32px] w-full border-b border-[#dbdbdb]"></div>
          </Fragment>
        ))}
      </section>
    </main>
  );
}
