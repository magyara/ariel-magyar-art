import { useEffect, useState } from 'react';

export function useCategories(): { data: string[]; loading: boolean; error: string | null }  { 
    const [data, setData] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        fetch('/api/categories')
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }

                return res.json();
            })
            .then(data => {
                if(!isMounted) return;

                setData(['All', ...data.categories]);
                setLoading(false);
            })

            .catch(err => {
                if (!isMounted) return;

                setError(err.message || 'Failed to fetch categories');
                setData([]);
                setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return { data, loading, error };
}