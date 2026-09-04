import { useEffect, useState } from 'react';
import type { Artwork } from '../types';

export function useArtworks(): { data: Artwork[]; loading: boolean; error: string | null }  { 
    const [data, setData] = useState<Artwork[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/artworks')
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }

                return res.json();
            })

            .then(data => {
                setData(data.artworks);
                setLoading(false);
            })

            .catch(err => {
                setError(err.message || 'Failed to fetch artworks');
                setData([]);
                setLoading(false);
            });
    }, []);

    return { data, loading, error };
}

export function useArtwork(id: string | undefined): { data: Artwork | null; loading: boolean; error: string | null }  { 
    const [data, setData] = useState<Artwork | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;

        fetch(`/api/artworks/${id}`)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Request failed with status ${res.status}`);
                }

                return res.json();
            })
            
            .then(data => {
                if (cancelled) return;

                setData(data.artwork ?? null);
                setLoading(false);
            })

            .catch(err => {
                if (cancelled) return;
                setError(err.message || 'Failed to fetch artwork');
                setData(null);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    return { data, loading, error };
}