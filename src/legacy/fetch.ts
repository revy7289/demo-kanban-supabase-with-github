const fetchIssuesByTeam = async (teamRepo) => {
  const teamIssue = await Promise.all(
    teamRepo.map(async (repo) => {
      const { data, error } = await supabase.from(repo).select('*');
      if (error) {
        console.error(`Error in table: ${repo}`);
        return [];
      }

      return data ?? [];
    })
  );
  const formattedIssue = teamIssue.flat().sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  setIssues(formattedIssue);
};

const fetchAllData = (project) => {
  const allTables = teamKanban.flatMap((team) => netteeRepo[project][team]);
  console.log(allTables);

  if (!fetchDataMap[key]) {
    const data = await fetchTeamIssue(section, team);

    setRepoDataMap((prev) => ({
      ...prev,
      [key]: data,
    }));

    setFetchDataMap((prev) => ({
      ...prev,
      [key]: true,
    }));
  }
};
