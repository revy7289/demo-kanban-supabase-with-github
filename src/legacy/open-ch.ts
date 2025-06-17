const openChannel = () => {
  const channel = supabase
    .channel('realtime-kanban')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload: RealtimePostgresChangesPayload<IssueData>) => {
        console.log('Realtime Change:', payload);

        setIssues((prev) => {
          const prevData = [
            ...prev.TODO,
            ...prev.DOING,
            ...prev.DONE,
            ...prev.CHECKED,
          ];

          let updateData: IssueData[];
          switch (payload.eventType) {
            case 'INSERT':
              updateData = [...prevData, payload.new];
              break;

            case 'UPDATE':
              updateData = prevData.map((item) =>
                item.sb_id === payload.new.sb_id ? payload.new : item
              );
              break;

            case 'DELETE':
              updateData = prevData.filter(
                (item) => item.sb_id !== payload.old.sb_id
              );
              break;

            default:
              return prev;
          }

          return updateData;
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
