import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string;
  avatar: string;
  city: string;
  lookingFor: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  showOnlineStatus?: boolean;
  profileVisible?: boolean;
  language?: string;
  notificationsEnabled?: boolean;
  role?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  avatar: string;
  city: string;
  role: string;
  emailVerified: boolean;
  profileVisible: boolean;
  createdAt: string;
  updatedAt: string;
  likesSent: number;
  likesReceived: number;
  matchCount: number;
  messageCount: number;
  momentsCount: number;
  lastActivity?: string;
}

export interface AdminUserDetail extends AdminUser {
  interests: string;
  lookingFor: string;
  showOnlineStatus: boolean;
  language: string;
  notificationsEnabled: boolean;
  stats: {
    likesSent: number;
    likesReceived: number;
    matchCount: number;
    messagesSent: number;
    messagesReceived: number;
    momentsCount: number;
    momentCommentsCount: number;
    momentReactionsCount: number;
    blocksReceived: number;
    blocksSent: number;
    reportsReceived: number;
    reportsSent: number;
    achievementsCount: number;
    lastActivity: string;
  };
}

export interface PlatformStats {
  totalUsers: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  activeUsers: number;
  totalMatches: number;
  totalMessages: number;
  totalLikes: number;
  totalMoments: number;
  totalReports: number;
  totalBlocks: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}

export interface MatchWithUsers {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  user1: User;
  user2: User;
  messages: Message[];
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
  sender?: { id: string; name: string; avatar: string };
}

export interface Moment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  gradient: string;
  createdAt: string;
  likes: number;
  comments: MomentComment[];
  reactions: Record<string, number>;
}

export interface MomentComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

type ViewType = 'landing' | 'browse' | 'matches' | 'chat' | 'profile' | 'likedYou' | 'moments' | 'top' | 'settings' | 'achievements' | 'admin';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AppState {
  currentView: ViewType;
  currentUser: User | null;
  authStatus: AuthStatus;
  selectedMatch: MatchWithUsers | null;
  selectedProfile: User | null;
  profiles: User[];
  matches: MatchWithUsers[];
  messages: Message[];
  showMatchAnimation: boolean;
  matchAnimationPartner: User | null;
  likedUserIds: string[];
  dislikedUserIds: string[];
  superLikedUserIds: string[];
  isLoading: boolean;
  chatListMatchId: string | null;
  likedYouCount: number;

  // Search filters
  searchQuery: string;
  sortBy: 'new' | 'name' | 'popular';
  filterGender: 'all' | 'male' | 'female';
  filterAgeMin: number;
  filterAgeMax: number;
  filterCity: string;
  showFilters: boolean;

  // Blocked users
  blockedUserIds: string[];

  // Online & notifications
  onlineUserIds: string[];
  unreadMatchIds: string[];

  // View transitions
  viewDirection: 'forward' | 'backward';
  previousView: ViewType | null;

  // Who liked you
  likedYouProfiles: User[];

  // Moments
  moments: Moment[];
  currentMomentIndex: number;

  // Settings
  notificationsEnabled: boolean;
  profileVisible: boolean;
  showOnlineStatus: boolean;
  language: string;

  // Achievements
  unlockedAchievements: string[];

  // Admin
  adminUsers: AdminUser[];
  adminSelectedUser: AdminUserDetail | null;
  adminStats: PlatformStats | null;
  adminLoading: boolean;
  adminUserDetailLoading: boolean;
  adminFilterGender: 'all' | 'male' | 'female' | 'other';
  adminSearchQuery: string;
  adminTotal: number;
  adminPage: number;
  adminLimit: number;

  setView: (view: ViewType) => void;
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAllData: () => void;
  setCurrentUser: (user: User | null) => void;
  setProfiles: (profiles: User[]) => void;
  setMatches: (matches: MatchWithUsers[]) => void;
  setSelectedMatch: (match: MatchWithUsers | null) => void;
  setSelectedProfile: (profile: User | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setShowMatchAnimation: (show: boolean) => void;
  setMatchAnimationPartner: (user: User | null) => void;
  addLikedUserId: (userId: string) => void;
  addDislikedUserId: (userId: string) => void;
  addSuperLikedUserId: (userId: string) => void;
  removeProfile: (userId: string) => void;
  setLikedYouCount: (count: number) => void;
  setIsLoading: (loading: boolean) => void;
  setChatListMatchId: (matchId: string | null) => void;

  // Filter actions
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'new' | 'name' | 'popular') => void;
  setFilterGender: (gender: 'all' | 'male' | 'female') => void;
  setFilterAgeMin: (age: number) => void;
  setFilterAgeMax: (age: number) => void;
  setFilterCity: (city: string) => void;
  setShowFilters: (show: boolean) => void;

  // Blocked users
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;

  // Online & notifications
  setOnlineUserIds: (ids: string[]) => void;
  setUnreadMatchIds: (ids: string[]) => void;

  // View transitions
  setViewDirection: (dir: 'forward' | 'backward') => void;
  setPreviousView: (view: ViewType | null) => void;

  // Who liked you
  setLikedYouProfiles: (profiles: User[]) => void;

  // Moments
  setMoments: (moments: Moment[]) => void;
  setCurrentMomentIndex: (index: number) => void;
  addMoment: (moment: Moment) => void;

  // Settings
  setNotificationEnabled: (enabled: boolean) => void;
  setProfileVisible: (visible: boolean) => void;
  setShowOnlineStatus: (show: boolean) => void;
  setLanguage: (lang: string) => void;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: {
    notificationsEnabled?: boolean;
    profileVisible?: boolean;
    showOnlineStatus?: boolean;
    language?: string;
  }) => Promise<void>;

  // Achievements
  unlockAchievement: (id: string) => void;

  // Custom setView with direction tracking
  navigateTo: (view: ViewType) => void;

  // Admin actions
  setAdminUsers: (users: AdminUser[]) => void;
  setAdminSelectedUser: (user: AdminUserDetail | null) => void;
  setAdminStats: (stats: PlatformStats | null) => void;
  setAdminLoading: (loading: boolean) => void;
  setAdminUserDetailLoading: (loading: boolean) => void;
  setAdminFilterGender: (gender: 'all' | 'male' | 'female' | 'other') => void;
  setAdminSearchQuery: (query: string) => void;
  setAdminPage: (page: number) => void;
  fetchAdminData: () => Promise<void>;
  fetchUserDetail: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  toggleUserRole: (userId: string) => Promise<void>;
  toggleUserProfileVisible: (userId: string) => Promise<void>;
}

const clearState = {
  currentUser: null,
  currentView: 'landing' as ViewType,
  previousView: null,
  profiles: [],
  matches: [],
  messages: [],
  selectedMatch: null,
  selectedProfile: null,
  likedUserIds: [],
  onlineUserIds: [],
  unreadMatchIds: [],
  dislikedUserIds: [],
  superLikedUserIds: [],
  likedYouCount: 0,
  likedYouProfiles: [],
  searchQuery: '',
  sortBy: 'new' as const,
  filterGender: 'all' as const,
  filterAgeMin: 0,
  filterAgeMax: 99,
  filterCity: '',
  showFilters: false,
  blockedUserIds: [],
  moments: [],
  currentMomentIndex: 0,
  notificationsEnabled: true,
  profileVisible: true,
  showOnlineStatus: true,
  language: 'ru',
  unlockedAchievements: [],
  showMatchAnimation: false,
  matchAnimationPartner: null,
  adminUsers: [],
  adminSelectedUser: null,
  adminStats: null,
  adminLoading: false,
  adminUserDetailLoading: false,
  adminFilterGender: 'all' as const,
  adminSearchQuery: '',
  adminTotal: 0,
  adminPage: 1,
  adminLimit: 20,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'landing',
  currentUser: null,
  authStatus: 'idle',
  selectedMatch: null,
  selectedProfile: null,
  profiles: [],
  matches: [],
  messages: [],
  showMatchAnimation: false,
  matchAnimationPartner: null,
  likedUserIds: [],
  dislikedUserIds: [],
  superLikedUserIds: [],
  isLoading: false,
  chatListMatchId: null,
  likedYouCount: 0,

  searchQuery: '',
  sortBy: 'new',
  filterGender: 'all',
  filterAgeMin: 0,
  filterAgeMax: 99,
  filterCity: '',
  showFilters: false,

  blockedUserIds: [],

  onlineUserIds: [],
  unreadMatchIds: [],

  viewDirection: 'forward',
  previousView: null,

  likedYouProfiles: [],

  moments: [],
  currentMomentIndex: 0,

  setView: (view) => set({ currentView: view }),

  navigateTo: (view) => {
    const currentView = get().currentView;
    const viewOrder: ViewType[] = ['landing', 'browse', 'matches', 'likedYou', 'profile', 'chat', 'moments', 'top', 'achievements', 'admin', 'settings'];
    const currentIdx = viewOrder.indexOf(currentView);
    const nextIdx = viewOrder.indexOf(view);
    const direction = nextIdx > currentIdx ? 'forward' : 'backward';

    set({
      previousView: currentView,
      currentView: view,
      viewDirection: direction,
    });
  },

  login: (user) => {
    const onlineIds: string[] = [];
    for (let i = 0; i < 7; i++) {
      onlineIds.push(`online-seed-${i}`);
    }
    set({
      currentUser: user,
      authStatus: 'authenticated',
      currentView: 'browse',
      previousView: 'landing',
      viewDirection: 'forward',
    });
  },

  logout: async () => {
    try {
      const { fetchWithCSRF } = await import('@/lib/api');
      await fetchWithCSRF('/api/auth/logout', {});
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    set({ ...clearState, authStatus: 'unauthenticated' });
  },

  checkAuth: async () => {
    set({ authStatus: 'loading' });
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          set({
            currentUser: data.user,
            authStatus: 'authenticated',
            currentView: 'browse',
          });
          // Hydrate app data using the user from response directly
          // to avoid race condition with Zustand state update
          const { hydrateAppData } = await import('@/lib/api');
          await hydrateAppData(data.user);
          return;
        }
      }
    } catch (error) {
      console.error('checkAuth failed:', error);
    }
    set({ authStatus: 'unauthenticated', currentView: 'landing' });
  },

  clearAllData: () => set({ ...clearState, authStatus: 'unauthenticated' }),

  setCurrentUser: (user) => set({ currentUser: user }),
  setProfiles: (profiles) => set({ profiles }),
  setMatches: (matches) => set({ matches }),
  setSelectedMatch: (match) => set({ selectedMatch: match }),
  setSelectedProfile: (profile) => set({ selectedProfile: profile }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setShowMatchAnimation: (show) => set({ showMatchAnimation: show }),
  setMatchAnimationPartner: (user) => set({ matchAnimationPartner: user }),
  addLikedUserId: (userId) => set((state) => ({ likedUserIds: [...state.likedUserIds, userId] })),
  addDislikedUserId: (userId) => set((state) => ({ dislikedUserIds: [...state.dislikedUserIds, userId] })),
  addSuperLikedUserId: (userId) => set((state) => ({ superLikedUserIds: [...state.superLikedUserIds, userId] })),
  removeProfile: (userId) => set((state) => ({
    profiles: state.profiles.filter((p) => p.id !== userId),
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setChatListMatchId: (matchId) => set({ chatListMatchId: matchId }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setFilterGender: (gender) => set({ filterGender: gender }),
  setFilterAgeMin: (age) => set({ filterAgeMin: age }),
  setFilterAgeMax: (age) => set({ filterAgeMax: age }),
  setFilterCity: (city) => set({ filterCity: city }),
  setShowFilters: (show) => set({ showFilters: show }),

  blockUser: (userId) => set((state) => ({
    blockedUserIds: [...state.blockedUserIds, userId],
    profiles: state.profiles.filter((p) => p.id !== userId),
  })),
  unblockUser: (userId) => set((state) => ({
    blockedUserIds: state.blockedUserIds.filter((id) => id !== userId),
  })),

  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
  setUnreadMatchIds: (ids) => set({ unreadMatchIds: ids }),

  setViewDirection: (dir) => set({ viewDirection: dir }),
  setPreviousView: (view) => set({ previousView: view }),

  setLikedYouProfiles: (profiles) => set({ likedYouProfiles: profiles, likedYouCount: profiles.length }),
  setLikedYouCount: (count) => set({ likedYouCount: count }),

  // Moments
  setMoments: (moments) => set({ moments }),
  setCurrentMomentIndex: (index) => set({ currentMomentIndex: index }),
  addMoment: (moment) => set((state) => ({ moments: [moment, ...state.moments] })),

  // Settings
  notificationsEnabled: true,
  profileVisible: true,
  showOnlineStatus: true,
  language: 'ru',
  setNotificationEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    get().saveSettings({ notificationsEnabled: enabled });
  },
  setProfileVisible: (visible) => {
    set({ profileVisible: visible });
    get().saveSettings({ profileVisible: visible });
  },
  setShowOnlineStatus: (show) => {
    set({ showOnlineStatus: show });
    get().saveSettings({ showOnlineStatus: show });
  },
  setLanguage: (lang) => {
    set({ language: lang });
    get().saveSettings({ language: lang });
  },
  loadSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const settings = await res.json();
        set({
          notificationsEnabled: settings.notificationsEnabled ?? true,
          profileVisible: settings.profileVisible ?? true,
          showOnlineStatus: settings.showOnlineStatus ?? true,
          language: settings.language ?? 'ru',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },
  saveSettings: async (settings) => {
    try {
      const { putWithCSRF } = await import('@/lib/api');
      await putWithCSRF('/api/settings', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  // Achievements
  unlockedAchievements: [],
  unlockAchievement: (id) => {
    set((state) => {
      if (state.unlockedAchievements.includes(id)) return state;
      // Fire and forget API call
      import('@/lib/api').then(({ fetchWithCSRF }) => {
        fetchWithCSRF('/api/achievements', { achievementId: id }).catch((error) => {
          console.error('Failed to unlock achievement:', error);
        });
      });
      return { unlockedAchievements: [...state.unlockedAchievements, id] };
    });
  },

  // Admin state
  adminUsers: [],
  adminSelectedUser: null,
  adminStats: null,
  adminLoading: false,
  adminUserDetailLoading: false,
  adminFilterGender: 'all',
  adminSearchQuery: '',
  adminTotal: 0,
  adminPage: 1,
  adminLimit: 20,

  // Admin actions
  setAdminUsers: (users) => set({ adminUsers: users }),
  setAdminSelectedUser: (user) => set({ adminSelectedUser: user }),
  setAdminStats: (stats) => set({ adminStats: stats }),
  setAdminLoading: (loading) => set({ adminLoading: loading }),
  setAdminUserDetailLoading: (loading) => set({ adminUserDetailLoading: loading }),
  setAdminFilterGender: (gender) => set({ adminFilterGender: gender, adminPage: 1 }),
  setAdminSearchQuery: (query) => set({ adminSearchQuery: query, adminPage: 1 }),
  setAdminPage: (page) => set({ adminPage: page }),

  fetchAdminData: async () => {
    set({ adminLoading: true });
    try {
      const { adminFilterGender, adminSearchQuery, adminPage, adminLimit } = get();
      const params = new URLSearchParams({
        gender: adminFilterGender,
        page: String(adminPage),
        limit: String(adminLimit),
      });
      if (adminSearchQuery) params.set('search', adminSearchQuery);

      const [usersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/users?${params}`),
        fetch('/api/admin/stats'),
      ]);
      if (usersRes.ok) {
        const { data, total } = await usersRes.json();
        set({ adminUsers: data ?? [], adminTotal: total ?? 0 });
      }
      if (statsRes.ok) {
        const { data } = await statsRes.json();
        set({ adminStats: data ?? null });
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      set({ adminLoading: false });
    }
  },

  fetchUserDetail: async (userId: string) => {
    set({ adminUserDetailLoading: true });
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const { data } = await res.json();
        set({ adminSelectedUser: data });
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    } finally {
      set({ adminUserDetailLoading: false });
    }
  },

  deleteUser: async (userId: string) => {
    try {
      const { deleteWithCSRF } = await import('@/lib/api');
      const res = await deleteWithCSRF(`/api/admin/users/${userId}`);
      if (res.ok) {
        set((state) => ({
          adminUsers: state.adminUsers.filter((u) => u.id !== userId),
          adminSelectedUser: state.adminSelectedUser?.id === userId ? null : state.adminSelectedUser,
          adminTotal: state.adminTotal - 1,
        }));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  },

  toggleUserRole: async (userId: string) => {
    try {
      const { patchWithCSRF } = await import('@/lib/api');
      const user = get().adminUsers.find((u) => u.id === userId);
      if (!user) return;
      const res = await patchWithCSRF(`/api/admin/users/${userId}`, {
        role: user.role === 'admin' ? 'user' : 'admin',
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          adminUsers: state.adminUsers.map((u) => u.id === userId ? { ...u, role: updated.data.role } : u),
          adminSelectedUser: state.adminSelectedUser?.id === userId ? { ...state.adminSelectedUser, role: updated.data.role } : state.adminSelectedUser,
        }));
      }
    } catch (error) {
      console.error('Failed to toggle user role:', error);
    }
  },

  toggleUserProfileVisible: async (userId: string) => {
    try {
      const { patchWithCSRF } = await import('@/lib/api');
      const user = get().adminUsers.find((u) => u.id === userId);
      if (!user) return;
      const res = await patchWithCSRF(`/api/admin/users/${userId}`, {
        profileVisible: !user.profileVisible,
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          adminUsers: state.adminUsers.map((u) => u.id === userId ? { ...u, profileVisible: updated.data.profileVisible } : u),
          adminSelectedUser: state.adminSelectedUser?.id === userId ? { ...state.adminSelectedUser, profileVisible: updated.data.profileVisible } : state.adminSelectedUser,
        }));
      }
    } catch (error) {
      console.error('Failed to toggle profile visible:', error);
    }
  },
}));
