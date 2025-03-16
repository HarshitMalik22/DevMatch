// Using Supabase client
const fetchMatchingProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [
        'c0b7f1e4-44fc-b9bb-3419e0457863',
        'f361c7b5-eb37-4cd2-aa2b-acda55afc780'
      ])
      .order('created_at', { ascending: false })
      .limit(1);
  
    if (error) {
      console.error('Fetch error:', error);
      return [];
    }
    return data;
  };
  
  // Usage in component
  useEffect(() => {
    const loadData = async () => {
      const profiles = await fetchMatchingProfiles();
      // Update state with profiles
    };
    loadData();
  }, []);