const fetchAllData = async () => {
  const allTable = Object.values(netteeRepo).flatMap((team) =>
    Object.values(team).flat()
  );

  const result = await Promise.all(
    allTable.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error in table: ${table}`);
        return [];
      }

      return data ?? [];
    })
  );

  return formattedIssue(result.flat());
};

const fetchTeamData = async (key: string) => {
  const [project, team] = key.split('-');
  const teamTable = netteeRepo[project]?.[team] ?? [];
  console.log(teamTable);

  const result = await Promise.all(
    teamTable.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error in table: ${table}`);
        return [];
      }

      return data ?? [];
    })
  );

  return result.flat();
};

const maybeFetchLazy = async (key) => {
  const data = await fetchTeamData(key);
  console.log(data);

  setRepoDataMap((prev) => ({
    ...prev,
    [key]: data,
  }));

  setFetchDataMap((prev) => ({
    ...prev,
    [key]: true,
  }));
};

const formattedIssue = (items) => {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return {
    TODO: sorted.filter((i) => i.progress === 'TODO'),
    DOING: sorted.filter((i) => i.progress === 'DOING'),
    DONE: sorted.filter((i) => i.progress === 'DONE'),
    CHECKED: sorted.filter((i) => i.progress === null),
  };
};

useEffect(() => {
  const fetchSupabase = async () => {
    let result;
    if (selectedProject.includes('전체')) {
      result = await fetchAllData();
    } else {
      const tables = selectedProject.flatMap((project) =>
        selectedTeam.includes('전체')
          ? Object.keys(netteeRepo[project])
          : selectedTeam
      );
      console.log('table:', tables);

      const fetchResult = await Promise.all(
        tables.map((team) => fetchTeamData(`${selectedProject[0]}-${team}`))
      );
      console.log('fetch res:', fetchResult);

      result = formattedIssue(fetchResult.flat());
      console.log('buff result:', result);
    }

    console.log('final result:', result);
    setIssues(result);
  };

  fetchSupabase();
}, [selectedProject, selectedTeam]);
