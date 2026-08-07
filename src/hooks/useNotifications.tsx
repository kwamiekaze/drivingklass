import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/portal";
import { usePortalAuth } from "./usePortalAuth";

const PAGE_SIZE = 100;

export function useNotifications() {
  const { user } = usePortalAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false),
    ]);

    if (data) {
      setNotifications(data as unknown as Notification[]);
      loadedRef.current = data.length;
      setHasMore(data.length === PAGE_SIZE);
    }
    setUnreadCount(count ?? 0);
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const from = loadedRef.current;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (data) {
      setNotifications(prev => {
        const seen = new Set(prev.map(n => n.id));
        const next = [...prev, ...(data as unknown as Notification[]).filter(n => !seen.has(n.id))];
        loadedRef.current = next.length;
        return next;
      });
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [user, loadingMore, hasMore]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update first
    setNotifications(prev => {
      const target = prev.find(n => n.id === notificationId);
      if (target && !target.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.map(n => n.id === notificationId ? { ...n, read: true } : n);
    });

    // Then update in database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) return prev;
            loadedRef.current += 1;
            return [newNotification, ...prev];
          });
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    hasMore,
    loadingMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
