import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type UserRole = 'user' | 'chef' | 'admin';

/** Catégories officielles des sauces AlloChef */
export const SAUCE_CATEGORIES = [
  { id: 'feuilles', label: 'Sauces à base de feuilles', emoji: '🌿' },
  { id: 'arachide', label: "Sauces à base d'arachide", emoji: '🥜' },
  { id: 'legumes', label: 'Sauces à base de légumes/condiments', emoji: '🥬' },
  { id: 'riz_au_gras', label: 'Riz au gras', emoji: '🍚' },
  { id: 'plats', label: 'Plats', emoji: '🍽️' }
] as const;

export type SauceCategoryId = (typeof SAUCE_CATEGORIES)[number]['id'];

export function getSauceCategoryLabel(categoryId: string | null | undefined): string {
  if (!categoryId) return SAUCE_CATEGORIES[0].label;
  const found = SAUCE_CATEGORIES.find(c => c.id === categoryId || c.label === categoryId);
  return found?.label ?? categoryId;
}

export function normalizeSauceCategory(category: string | null | undefined): SauceCategoryId {
  if (!category) return 'legumes';
  const direct = SAUCE_CATEGORIES.find(c => c.id === category);
  if (direct) return direct.id;
  const byLabel = SAUCE_CATEGORIES.find(c => c.label.toLowerCase() === category.toLowerCase());
  if (byLabel) return byLabel.id;

  const lower = category.toLowerCase();
  if (lower.includes('feuille')) return 'feuilles';
  if (lower.includes('arachide')) return 'arachide';
  if (lower.includes('légume') || lower.includes('legume') || lower.includes('condiment')) return 'legumes';
  if (lower.includes('riz')) return 'riz_au_gras';
  if (lower.includes('plat')) return 'plats';

  return 'legumes';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  role: UserRole;
  is_admin: boolean;
  is_banned?: boolean;
  favorites_count: number;
  cooking_level: string;
  followed_count: number;
  created_at?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalChefs: number;
  pendingChefs: number;
  pendingContent: number;
  pendingOrders: number;
}

export interface ChefProfile {
  id: string;
  user_id: string;
  name: string;
  specialty: string;
  avatar: string | null;
  bio: string | null;
  followers: number;
  is_verified: boolean;
  created_at?: string;
}

export interface ChefSignupMeta {
  specialty: string;
  bio: string;
}

export interface RecipeIngredient {
  name: string;
  quantity?: number | string;
  unit?: string;
  scalable?: boolean;
}

export interface RecipeItem {
  id: string;
  source: 'recipe' | 'sauce';
  title: string;
  description?: string | null;
  video_url?: string | null;
  image_url?: string | null;
  difficulty?: string | null;
  duration?: number | null;
  category?: string | null;
  views?: number | null;
  likes?: number | null;
  status?: string | null;
  base_servings?: number | null;
  servings?: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  utensils?: Array<{ name: string } | string>;
  compatibleDishes?: string[];
  chef?: { name?: string | null; avatar?: string | null } | null;
}

export interface SauceComment {
  id: string;
  sauce_id: string;
  user_id: string | null;
  content: string;
  chef_reply?: string | null;
  chef_reply_at?: string | null;
  created_at: string;
  user?: { name?: string | null; avatar?: string | null } | null;
}

export interface SauceFeedbackSummary {
  sauceId: string;
  title?: string;
  views: number;
  likes: number;
  favorites: number;
  comments: SauceComment[];
}

export interface OrderItemRecord {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  price: number;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  recipe_name: string;
  recipe_id?: string | null;
  date: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivered';
  total: number;
  item_count: number;
  items?: OrderItemRecord[];
  created_at?: string;
}

export interface ChefWithUser extends ChefProfile {
  user?: UserProfile | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

const OAUTH_ROLE_KEY = 'allochef_oauth_role';
const OAUTH_CHEF_META_KEY = 'allochef_oauth_chef_meta';
const FAVORITES_STORAGE_KEY = 'allochef_favorite_items';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private static client: SupabaseClient;
  private static adminSessionCache: { profile: UserProfile; until: number } | null = null;
  private static adminStatsCache: { data: AdminStats; until: number } | null = null;
  private static adminAssertPromise: Promise<UserProfile> | null = null;
  private static readonly ADMIN_CACHE_MS = 120_000;

  private static invalidateAdminCache() {
    this.adminSessionCache = null;
    this.adminStatsCache = null;
    this.adminAssertPromise = null;
  }

  static init(): SupabaseClient {
    if (!this.client) {
      this.client = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'allochef-supabase-auth',
            // Empêche les requêtes concurrentes de refresh token (cause du 429 Too Many Requests)
            // tout en évitant le NavigatorLockAcquireTimeoutError lié au live reload.
            lock: (() => {
              let currentLock: Promise<any> | null = null;
              return async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                while (currentLock) {
                  try { await currentLock; } catch (e) {}
                }
                const promise = fn();
                currentLock = promise.finally(() => { currentLock = null; });
                return promise;
              };
            })()
          }
        }
      );
    }
    return this.client;
  }

  static getOAuthRedirectUrl(): string {
    return `${window.location.origin}/#/auth/callback`;
  }

  static mapAuthError(error: { message?: string; status?: number }): string {
    const msg = error.message?.toLowerCase() ?? '';

    if (msg.includes('invalid login credentials')) {
      return 'Email ou mot de passe incorrect.';
    }
    if (msg.includes('user already registered')) {
      return 'Un compte existe déjà avec cet email.';
    }
    if (msg.includes('password should be at least')) {
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    }
    if (msg.includes('unable to validate email')) {
      return 'Adresse email invalide.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Email non confirmé. Vérifiez votre boîte mail ou désactivez "Confirm email" dans Supabase (Authentication → Providers → Email).';
    }
    if (msg.includes('duplicate key') || msg.includes('users_email_key')) {
      return 'Un profil existe déjà pour cet utilisateur.';
    }
    if (msg.includes('could not find the table') || msg.includes('schema cache')) {
      return 'La table users n\'existe pas dans Supabase. Exécutez le script supabase_setup_initial.sql dans le SQL Editor.';
    }

    // Auto-clear corrupted session
    const status = (error as any).status;
    const isAuthError = status === 401 || msg.includes('401') || msg.includes('jwt expired') || msg.includes('invalid jwt');
    
    if (isAuthError) {
      localStorage.removeItem('allochef-supabase-auth');
      this.client?.auth?.signOut().catch(() => {});
      this.client = null as any; // Force re-initialization of the client
      return 'Votre session a expiré ou a rencontré un problème. Veuillez vous reconnecter.';
    }

    return error.message || 'Une erreur est survenue. Réessayez.';
  }

  private static isMissingUsersTableError(error: { code?: string; message?: string }) {
    const message = error.message?.toLowerCase() ?? '';
    return (
      error.code === 'PGRST205' ||
      message.includes('could not find the table') ||
      message.includes('schema cache') ||
      message.includes('relation "public.users" does not exist')
    );
  }

  private static profileFromAuthUser(user: User, overrides: Partial<UserProfile> = {}): UserProfile {
    const role = (overrides.role ||
      user.user_metadata?.role ||
      (overrides.is_admin ? 'admin' : 'user')) as UserRole;

    const name =
      overrides.name ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Utilisateur';

    return {
      id: user.id,
      email: overrides.email || user.email || '',
      name,
      avatar: overrides.avatar ?? user.user_metadata?.avatar ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
      bio: overrides.bio ?? user.user_metadata?.bio ?? null,
      role,
      is_admin: overrides.is_admin ?? role === 'admin',
      favorites_count: overrides.favorites_count ?? 0,
      cooking_level: overrides.cooking_level || 'DÃ©butant',
      followed_count: overrides.followed_count ?? 0,
      created_at: overrides.created_at
    };
  }

  // AUTH
  static async signUp(
    email: string,
    password: string,
    name: string,
    metadata?: { role?: UserRole; specialty?: string; bio?: string }
  ) {
    const cleanEmail = email.trim().toLowerCase();
    const role = metadata?.role ?? 'user';

    const { data, error } = await this.init().auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name,
          role,
          specialty: metadata?.specialty,
          bio: metadata?.bio
        }
      }
    });
    if (error) throw new Error(this.mapAuthError(error));

    let authData = data;

    if (authData.user && !authData.session) {
      const { data: signInData, error: signInError } = await this.init().auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (signInError) {
        const message = signInError.message?.toLowerCase() ?? '';
        if (message.includes('email not confirmed')) {
          return authData;
        }
        if (message.includes('email not confirmed')) {
          throw new Error(
            'Supabase demande encore une confirmation email. DÃ©sactivez "Confirm email" dans Authentication > Providers > Email, puis rÃ©essayez avec un nouveau compte.'
          );
        }
        throw new Error(this.mapAuthError(signInError));
      }

      authData = signInData;
    }

    if (authData.user && authData.session) {
      await this.ensureUserProfile(authData.user);

      if (role === 'chef' && metadata?.specialty) {
        await this.updateUser(authData.user.id, { role: 'chef', bio: metadata.bio ?? null });
        await this.createChefProfile(authData.user.id, {
          name,
          specialty: metadata.specialty,
          bio: metadata.bio ?? ''
        });
      }
    }

    return authData;
  }

  static async signUpChef(
    email: string,
    password: string,
    name: string,
    specialty: string,
    bio: string
  ) {
    return this.signUp(email, password, name, { role: 'chef', specialty, bio });
  }

  static async signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await this.init().auth.signInWithPassword({
      email: cleanEmail,
      password
    });
    if (error) throw new Error(this.mapAuthError(error));

    if (data.user) {
      const profile = await this.ensureUserProfile(data.user);
      if (profile.is_banned) {
        await this.signOut();
        throw new Error('Votre compte a été suspendu. Contactez le support.');
      }
    }

    return data;
  }

  static async signInChef(email: string, password: string) {
    const data = await this.signIn(email, password);
    const user = data.user;

    if (!user) {
      throw new Error('Session introuvable. Vérifiez votre email de confirmation.');
    }

    const profile = await this.ensureUserProfile(user);

    if (profile.is_banned) {
      await this.signOut();
      throw new Error('Votre compte a été suspendu. Contactez le support.');
    }

    if (profile.role !== 'chef' && !profile.is_admin) {
      await this.signOut();
      throw new Error('Ce compte n\'est pas un compte chef. Utilisez la connexion élève.');
    }

    await this.ensureChefProfile(user.id, profile);
    return { data, profile };
  }

  static async signInWithGoogle(options?: { role?: UserRole; chefMeta?: ChefSignupMeta }) {
    if (options?.role) {
      sessionStorage.setItem(OAUTH_ROLE_KEY, options.role);
    } else {
      sessionStorage.removeItem(OAUTH_ROLE_KEY);
    }

    if (options?.chefMeta) {
      sessionStorage.setItem(OAUTH_CHEF_META_KEY, JSON.stringify(options.chefMeta));
    } else {
      sessionStorage.removeItem(OAUTH_CHEF_META_KEY);
    }

    const { error } = await this.init().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: this.getOAuthRedirectUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) throw new Error(this.mapAuthError(error));
  }

  static async completeOAuthSession(): Promise<{ profile: UserProfile; chef?: ChefProfile }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const session = await this.getSession();
    if (!session?.user) {
      throw new Error('Connexion Google échouée. Réessayez.');
    }

    const user = session.user;
    let profile = await this.ensureUserProfile(user);

    const oauthRole = sessionStorage.getItem(OAUTH_ROLE_KEY) as UserRole | null;
    const chefMetaRaw = sessionStorage.getItem(OAUTH_CHEF_META_KEY);
    sessionStorage.removeItem(OAUTH_ROLE_KEY);
    sessionStorage.removeItem(OAUTH_CHEF_META_KEY);

    const googleName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.given_name;
    const googleAvatar =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture;

    const updates: Partial<UserProfile> = {};
    if (googleName && (!profile.name || profile.name === 'Utilisateur')) {
      updates.name = googleName;
    }
    if (googleAvatar && !profile.avatar) {
      updates.avatar = googleAvatar;
    }

    let chef: ChefProfile | undefined;

    if (oauthRole === 'chef') {
      updates.role = 'chef';
      profile = await this.updateUser(user.id, { ...updates, role: 'chef' });

      const chefMeta: ChefSignupMeta | null = chefMetaRaw ? JSON.parse(chefMetaRaw) : null;
      chef = await this.ensureChefProfile(user.id, profile, chefMeta ?? undefined);
    } else if (Object.keys(updates).length > 0) {
      profile = await this.updateUser(user.id, updates);
    }

    return { profile, chef };
  }

  static getPostAuthRoute(profile: UserProfile): string[] {
    if (profile.is_admin || profile.role === 'admin') {
      return ['/admin/users'];
    }
    if (profile.role === 'chef') {
      return ['/tabs/tab5'];
    }
    return ['/tabs/tab1'];
  }

  static async signOut() {
    const { error } = await this.init().auth.signOut();
    if (error) throw new Error(this.mapAuthError(error));
    this.invalidateAdminCache();
  }

  static async resetPassword(email: string) {
    const { error } = await this.init().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/auth/login`
    });
    if (error) throw new Error(this.mapAuthError(error));
  }

  static async getSession() {
    const { data } = await this.init().auth.getSession();
    return data.session;
  }

  static async getUser(): Promise<User | null> {
    const { data } = await this.init().auth.getUser();
    return data.user;
  }

  static async getCurrentUser() {
    return this.getUser();
  }

  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.init().auth.onAuthStateChange(callback);
  }

  static resolveRole(profile: UserProfile): UserRole {
    if (profile.is_admin) return 'admin';
    if (profile.role === 'chef') return 'chef';
    return 'user';
  }

  // USERS TABLE
  static async getUserProfile(id: string): Promise<UserProfile | null> {
    const { data, error } = await this.init()
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (this.isMissingUsersTableError(error)) {
        return null;
      }
      const code = (error as { code?: string }).code;
      if (code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        throw new Error(
          'La table users est introuvable. Exécutez supabase_fix_users_table.sql dans le SQL Editor Supabase.'
        );
      }
      throw new Error(this.mapAuthError(error));
    }
    if (!data) return null;

    return {
      ...data,
      role: data.role ?? (data.is_admin ? 'admin' : 'user')
    } as UserProfile;
  }

  static async waitForUserProfile(userId: string, maxAttempts = 5): Promise<UserProfile | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const profile = await this.getUserProfile(userId);
      if (profile) return profile;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    return null;
  }

  static async ensureUserProfile(user: User): Promise<UserProfile> {
    const existing = await this.getUserProfile(user.id);
    if (existing) return existing;

    const name =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Utilisateur';

    const role = (user.user_metadata?.role ?? 'user') as UserRole;
    await this.createUserProfile(user.id, user.email ?? '', name, role);

    const profile = await this.getUserProfile(user.id);
    if (!profile) {
      return this.profileFromAuthUser(user, { name, role });
      throw new Error('Impossible de créer votre profil. Vérifiez la configuration Supabase.');
    }
    return profile;
  }

  static async updateUser(id: string, updates: Partial<UserProfile>) {
    const { data, error } = await this.init()
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (this.isMissingUsersTableError(error)) {
        const user = await this.getUser();
        if (user?.id === id) {
          return this.profileFromAuthUser(user, updates);
        }
      }
      throw new Error(this.mapAuthError(error));
    }
    return {
      ...data,
      role: data.role ?? (data.is_admin ? 'admin' : 'user')
    } as UserProfile;
  }

  static async createUserProfile(
    id: string,
    email: string,
    name: string,
    role: UserRole = 'user'
  ) {
    const { error } = await this.init()
      .from('users')
      .insert({
        id,
        email,
        name,
        avatar: null,
        bio: null,
        role,
        is_admin: role === 'admin'
      });

    if (error && this.isMissingUsersTableError(error)) {
      return;
    }

    if (error && !error.message?.includes('duplicate key')) {
      throw new Error(this.mapAuthError(error));
    }
  }

  static async deleteUser(id: string) {
    const { error } = await this.init()
      .from('users')
      .delete()
      .eq('id', id);
    if (error) throw new Error(this.mapAuthError(error));
  }

  static getDefaultAvatar(name: string): string {
    const encoded = encodeURIComponent(name || 'U');
    return `https://ui-avatars.com/api/?name=${encoded}&background=D4AF37&color=1a1a1a&size=200`;
  }

  static resolveAvatarUrl(avatar: string | null | undefined, name: string): string {
    if (avatar?.trim()) return avatar;
    return this.getDefaultAvatar(name);
  }

  // CHEFS TABLE
  static async getChefByUserId(userId: string): Promise<ChefProfile | null> {
    const { data, error } = await this.init()
      .from('chefs')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(this.mapAuthError(error));
    return data as ChefProfile | null;
  }

  static async getChefById(chefId: string): Promise<ChefProfile | null> {
    const { data, error } = await this.init()
      .from('chefs')
      .select('*')
      .eq('id', chefId)
      .maybeSingle();

    if (error) throw new Error(this.mapAuthError(error));
    if (!data) return null;

    return {
      ...(data as ChefProfile),
      avatar: this.resolveAvatarUrl(data.avatar, data.name)
    };
  }

  static async isChefFollowed(chefId: string): Promise<boolean> {
    const session = await this.getSession();
    const userId = session?.user?.id;
    if (!userId) return false;

    const { data, error } = await this.init()
      .from('follows')
      .select('chef_id')
      .eq('user_id', userId)
      .eq('chef_id', chefId);

    if (error) throw new Error(this.mapAuthError(error));
    if (!data) return false;
    return Array.isArray(data) ? data.length > 0 : !!data;
  }

  static async toggleFollowChef(chefId: string): Promise<{ isFollowing: boolean; followers: number; followedCount: number }> {
    const session = await this.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Connectez-vous pour suivre un chef.');

    let existingFollow: any = null;
    try {
      const { data, error } = await this.init()
        .from('follows')
        .select('*')
        .eq('user_id', userId)
        .eq('chef_id', chefId);
      if (error) throw error;
      existingFollow = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
    } catch (e: any) {
      console.warn('toggleFollowChef fallback reading follows list due to:', e?.message ?? e);
      const { data: list, error: listErr } = await this.init()
        .from('follows')
        .select('*')
        .eq('user_id', userId)
        .eq('chef_id', chefId)
        .limit(1);
      if (listErr) throw new Error(this.mapAuthError(listErr));
      existingFollow = Array.isArray(list) && list.length > 0 ? list[0] : null;
    }

    const chef = await this.getChefById(chefId);
    if (!chef) throw new Error('Chef introuvable.');
    if (chef.user_id === userId) {
      throw new Error('Vous ne pouvez pas suivre votre propre profil.');
    }

    const profile = await this.getUserProfile(userId);
    const currentFollowedCount = profile?.followed_count ?? 0;
    const nextFollowedCount = existingFollow ? Math.max(currentFollowedCount - 1, 0) : currentFollowedCount + 1;
    const nextFollowers = existingFollow ? Math.max(chef.followers - 1, 0) : chef.followers + 1;

    if (existingFollow) {
      const { error: deleteError } = await this.init()
        .from('follows')
        .delete()
        .eq('user_id', userId)
        .eq('chef_id', chefId);
      if (deleteError) {
        console.error('toggleFollowChef deleteError raw:', deleteError);
        throw new Error(this.mapAuthError(deleteError));
      }
    } else {
      const sess = await this.getSession();
      console.debug('toggleFollowChef - session user:', sess?.user?.id, 'hasAccessToken:', !!(sess as any)?.access_token);
      const { error: insertError } = await this.init()
        .from('follows')
        .insert({ user_id: userId, chef_id: chefId });
      if (insertError) {
        console.error('toggleFollowChef insertError raw:', insertError);
        throw new Error(this.mapAuthError(insertError));
      }
    }

    await this.updateUser(userId, { followed_count: nextFollowedCount });

    return {
      isFollowing: !existingFollow,
      followers: nextFollowers,
      followedCount: nextFollowedCount
    };
  }

  static async createChefProfile(
    userId: string,
    chef: { name: string; specialty: string; bio: string; avatar?: string | null }
  ): Promise<ChefProfile> {
    const { data, error } = await this.init()
      .from('chefs')
      .insert({
        user_id: userId,
        name: chef.name,
        specialty: chef.specialty,
        bio: chef.bio,
        avatar: chef.avatar || this.getDefaultAvatar(chef.name),
        followers: 0,
        is_verified: false
      })
      .select()
      .single();

    if (error) throw new Error(this.mapAuthError(error));
    return data as ChefProfile;
  }

  static async ensureChefProfile(
    userId: string,
    userProfile: UserProfile,
    chefMeta?: ChefSignupMeta
  ): Promise<ChefProfile> {
    const existing = await this.getChefByUserId(userId);
    if (existing) return existing;

    return this.createChefProfile(userId, {
      name: userProfile.name,
      specialty: chefMeta?.specialty || 'Cuisine générale',
      bio: chefMeta?.bio || userProfile.bio || '',
      avatar: userProfile.avatar
    });
  }

  static async updateChef(userId: string, updates: Partial<ChefProfile>) {
    const { data, error } = await this.init()
      .from('chefs')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(this.mapAuthError(error));
    return data as ChefProfile;
  }

  static async updateChefFollowers(chefId: string, followers: number) {
    const { data, error } = await this.init()
      .from('chefs')
      .update({ followers })
      .eq('id', chefId)
      .select()
      .single();

    if (error) {
      console.error('updateChefFollowers error raw:', error);
      throw new Error(this.mapAuthError(error));
    }
    return data as ChefProfile;
  }

  static async getChefs(): Promise<ChefProfile[]> {
    const { data, error } = await this.init()
      .from('chefs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Chefs loading error', error);
      return [];
    }

    return (data ?? []).map((chef: any) => ({
      ...chef,
      avatar: this.resolveAvatarUrl(chef.avatar, chef.name)
    })) as ChefProfile[];
  }


  /** Fetch public sauces for a chef profile (by chef table id) — includes published AND pending */
  static async getSaucesByChefId(chefId: string): Promise<RecipeItem[]> {
    try {
      const { data, error } = await this.init()
        .from('sauces')
        .select('*')
        .eq('chef_id', chefId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to load chef profile sauces', error);
        return [];
      }

      // Show published and pending (pending = awaiting moderation but still belongs to chef)
      return (data ?? [])
        .map(row => this.normalizeRecipeRow(row, 'sauce'))
        .filter(item => !item.status || ['published', 'approved', 'pending'].includes(item.status));
    } catch (err) {
      console.warn('Error loading chef profile sauces', err);
      return [];
    }
  }

  /** Fetch users who follow a given chef (by chef table id) */
  static async getChefFollowers(chefId: string): Promise<Array<{ id: string; name: string; avatar: string | null; email?: string }>> {
    try {
      const { data, error } = await this.init()
        .from('follows')
        .select('user_id, users:user_id(id, name, avatar, email)')
        .eq('chef_id', chefId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Unable to load chef followers', error);
        return [];
      }

      return (data ?? [])
        .map((row: any) => {
          const u = row.users ?? {};
          return {
            id: u.id ?? row.user_id,
            name: u.name ?? 'Utilisateur',
            avatar: this.resolveAvatarUrl(u.avatar, u.name ?? 'U'),
            email: u.email ?? ''
          };
        });
    } catch (err) {
      console.warn('Error loading chef followers', err);
      return [];
    }
  }

  /** Fetch aggregated public stats for a chef (followers, total views, total likes, total comments) */
  static async getChefPublicStats(chefId: string): Promise<{
    followers: number;
    totalSauces: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
  }> {
    try {
      const [saucesRes, commentsRes] = await Promise.all([
        this.init()
          .from('sauces')
          .select('views, likes')
          .eq('chef_id', chefId),
        this.init()
          .from('sauce_comments')
          .select('id', { count: 'exact', head: true })
          .in(
            'sauce_id',
            // sub-select sauce ids for this chef
            (await this.init().from('sauces').select('id').eq('chef_id', chefId)).data?.map((r: any) => r.id) ?? []
          )
      ]);

      const sauces = saucesRes.data ?? [];
      const totalViews = sauces.reduce((sum: number, s: any) => sum + (s.views ?? 0), 0);
      const totalLikes = sauces.reduce((sum: number, s: any) => sum + (s.likes ?? 0), 0);
      const totalComments = commentsRes.count ?? 0;

      // Get real follower count from follows table
      const { count: followersCount } = await this.init()
        .from('follows')
        .select('chef_id', { count: 'exact', head: true })
        .eq('chef_id', chefId);

      return {
        followers: followersCount ?? 0,
        totalSauces: sauces.length,
        totalViews,
        totalLikes,
        totalComments
      };
    } catch (err) {
      console.warn('Error loading chef public stats', err);
      return { followers: 0, totalSauces: 0, totalViews: 0, totalLikes: 0, totalComments: 0 };
    }
  }

  // ----- Chef's Sauces CRUD -----
  /** Fetch all sauces created by a specific chef (by user ID) */
  static async getSaucesByChef(userId: string): Promise<RecipeItem[]> {
    const chef = await this.getChefByUserId(userId);
    if (!chef) return [];

    try {
      const { data, error } = await this.init()
        .from('sauces')
        .select('*')
        .eq('chef_id', chef.id)
        .order('created_at', { ascending: false });
      if (error) {
        // If the error is due to missing column (42703), we'll fallback below.
        console.warn('Failed to load chef sauces', error);
        if (!(error?.message && error.message.toLowerCase().includes('chef_id')) && error?.code !== '42703') {
          return [];
        }
      } else {
        return (data ?? []).map(row => this.normalizeRecipeRow(row, 'sauce'));
      }
    } catch (err: any) {
      console.warn('Error querying chef sauces, will fallback to client filter', err);
    }

    // Fallback: fetch all sauces and filter client-side by chef name when chef_id column is absent.
    try {
      const all = await this.getSauces();
      return (all ?? []).filter(s => s.chef?.name && chef.name && s.chef.name === chef.name);
    } catch (e) {
      console.warn('Fallback client-side filter failed for chef sauces', e);
      return [];
    }
  }

  /** Update an existing sauce (chef owner only) */
  static async updateSauce(sauceId: string, updates: Partial<any>) {
    const session = await this.getSession();
    if (!session?.user?.id) throw new Error('Connectez-vous pour modifier cette sauce.');
    await this.assertSauceOwnership(sauceId, session.user.id);

    const { data, error } = await this.init()
      .from('sauces')
      .update(updates)
      .eq('id', sauceId)
      .select()
      .single();
    if (error) throw new Error(this.mapAuthError(error));
    return data as any;
  }

  /** Delete a sauce (chef owner only) */
  static async deleteSauce(sauceId: string) {
    const session = await this.getSession();
    if (!session?.user?.id) throw new Error('Connectez-vous pour supprimer cette sauce.');
    await this.assertSauceOwnership(sauceId, session.user.id);

    const { error } = await this.init()
      .from('sauces')
      .delete()
      .eq('id', sauceId);
    if (error) throw new Error(this.mapAuthError(error));
    return true;
  }

  private static async assertSauceOwnership(sauceId: string, userId: string) {
    const chef = await this.getChefByUserId(userId);
    if (!chef) throw new Error('Profil chef introuvable.');

    const { data, error } = await this.init()
      .from('sauces')
      .select('chef_id')
      .eq('id', sauceId)
      .maybeSingle();

    if (error) throw new Error(this.mapAuthError(error));
    if (!data) throw new Error('Sauce introuvable.');
    if (data.chef_id && data.chef_id !== chef.id) {
      throw new Error('Vous ne pouvez gérer que vos propres sauces.');
    }
  }

  static getFavoriteKey(item: Pick<RecipeItem, 'id' | 'source'> | string, source: 'recipe' | 'sauce' = 'recipe') {
    if (typeof item === 'string') return `${source}:${item}`;
    return `${item.source}:${item.id}`;
  }

  private static normalizeJsonArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed as T[] : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private static normalizeRecipeRow(row: any, source: 'recipe' | 'sauce'): RecipeItem {
    const compatible = this.normalizeJsonArray<string>(row.compatible_dishes ?? row.compatibleDishes);
    const chef = row.chef || row.chefs || null;

    return {
      id: row.id,
      source,
      title: row.title,
      description: row.description ?? '',
      video_url: row.video_url ?? null,
      image_url: row.image_url ?? null,
      difficulty: row.difficulty ?? 'Facile',
      duration: row.duration ?? 30,
      category: source === 'sauce'
        ? normalizeSauceCategory(row.category)
        : (row.category ?? 'Recette'),
      views: row.views ?? 0,
      likes: row.likes ?? 0,
      status: row.status ?? 'published',
      base_servings: row.base_servings ?? row.servings ?? 4,
      servings: row.servings ?? row.base_servings ?? 4,
      ingredients: this.normalizeJsonArray<RecipeIngredient>(row.ingredients),
      steps: this.normalizeJsonArray<string>(row.steps),
      utensils: this.normalizeJsonArray<{ name: string } | string>(row.utensils),
      compatibleDishes: compatible,
      chef: chef ? {
        name: chef.name ?? 'Chef AlloChef',
        avatar: chef.avatar ?? null
      } : {
        name: source === 'sauce' ? 'AlloChef' : 'Chef AlloChef',
        avatar: null
      }
    };
  }

  static getDemoRecipes(): RecipeItem[] {
    return [
      {
        id: 'demo-sauce-feuille',
        source: 'sauce',
        title: 'Sauce Feuille de Patate',
        description: 'Une sauce traditionnelle guineenne a base de feuilles de patate douce, riche en saveurs et en nutriments.',
        image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=500&fit=crop',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-cooking-in-a-modern-kitchen-40010-large.mp4',
        difficulty: 'Intermediaire',
        duration: 45,
        category: 'Sauces africaines',
        views: 12500,
        base_servings: 4,
        servings: 4,
        chef: { name: 'Chef Amina', avatar: 'https://i.pravatar.cc/150?img=1' },
        ingredients: [
          { name: 'Feuilles de patate douce', quantity: 500, unit: 'g' },
          { name: 'Huile de palme', quantity: 200, unit: 'ml' },
          { name: 'Oignons', quantity: 2, unit: 'pcs' },
          { name: 'Tomates fraiches', quantity: 4, unit: 'pcs' },
          { name: 'Piment', quantity: 2, unit: 'pcs' },
          { name: 'Sel', quantity: 1, unit: 'c. a s', scalable: false },
          { name: 'Poisson fume', quantity: 200, unit: 'g' },
          { name: 'Viande de boeuf', quantity: 300, unit: 'g' }
        ],
        steps: [
          'Lavez et hachez finement les feuilles de patate douce.',
          'Faites bouillir la viande avec du sel et un peu d oignon pendant 30 minutes.',
          'Faites chauffer l huile de palme, puis faites revenir les oignons eminces.',
          'Ajoutez les tomates mixees et le piment, puis laissez mijoter 10 minutes.',
          'Ajoutez les feuilles hachees, melangez, couvrez et laissez cuire 15 minutes.',
          'Incorporez le poisson fume et la viande. Laissez mijoter encore 10 minutes.',
          'Rectifiez l assaisonnement et servez chaud avec du riz blanc.'
        ],
        compatibleDishes: ['Riz blanc', 'Fonio', 'To', 'Banane plantain']
      },
      {
        id: 'demo-sauce-arachide',
        source: 'sauce',
        title: 'Sauce Arachide au Boeuf',
        description: 'Une sauce onctueuse a la pate d arachide, parfaite avec du riz ou du fonio.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop',
        difficulty: 'Moyen',
        duration: 60,
        category: 'Sauces mijotees',
        views: 8400,
        base_servings: 4,
        servings: 4,
        chef: { name: 'Chef Moussa', avatar: 'https://i.pravatar.cc/150?img=11' },
        ingredients: [
          { name: 'Boeuf', quantity: 500, unit: 'g' },
          { name: 'Pate d arachide', quantity: 4, unit: 'c. a s' },
          { name: 'Tomates', quantity: 3, unit: 'pcs' },
          { name: 'Oignons', quantity: 2, unit: 'pcs' },
          { name: 'Carottes', quantity: 2, unit: 'pcs' },
          { name: 'Eau', quantity: 700, unit: 'ml' },
          { name: 'Sel', quantity: 1, unit: 'c. a c', scalable: false }
        ],
        steps: [
          'Faites dorer la viande avec les oignons.',
          'Ajoutez les tomates mixees et laissez reduire.',
          'Diluez la pate d arachide dans un peu d eau tiede.',
          'Versez dans la marmite avec le reste d eau et les legumes.',
          'Laissez mijoter jusqu a ce que la sauce soit epaisse et la viande tendre.'
        ],
        compatibleDishes: ['Riz blanc', 'Fonio', 'Couscous de manioc']
      }
    ];
  }

  private static filterRecipes(recipes: RecipeItem[], query = ''): RecipeItem[] {
    const clean = query.trim().toLowerCase();
    if (!clean) return recipes;

    return recipes.filter(recipe => {
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.chef?.name,
        ...recipe.ingredients.map(ingredient => ingredient.name)
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(clean);
    });
  }

  static async getRecipes(query = ''): Promise<RecipeItem[]> {
    const listColumns = 'id, title, description, image_url, video_url, difficulty, duration, views, likes, base_servings, created_at';
    try {
      const [{ data: recipes, error: recipesError }, { data: sauces, error: saucesError }] = await Promise.all([
        this.init()
          .from('recipes')
          .select(`${listColumns}, chef:chefs(name, avatar)`)
          .order('created_at', { ascending: false }),
        this.init()
          .from('sauces')
          .select(listColumns)
          .order('created_at', { ascending: false })
      ]);

      if (recipesError && !this.isMissingUsersTableError(recipesError)) {
        console.warn('Recipes loading error', recipesError);
      }
      if (saucesError && !this.isMissingUsersTableError(saucesError)) {
        console.warn('Sauces loading error', saucesError);
      }

      const rows = [
        ...((recipes ?? []) as any[]).map(row => this.normalizeRecipeRow(row, 'recipe')),
        ...((sauces ?? []) as any[]).map(row => this.normalizeRecipeRow(row, 'sauce'))
      ].filter(item => !item.status || item.status === 'published');

      // Only fall back to demo recipes when there was an actual Supabase error.
      // If the queries succeeded but returned an empty set, return the empty
      // result so the app doesn't show demo items that aren't in the DB.
      const hadError = (recipesError && !this.isMissingUsersTableError(recipesError)) ||
        (saucesError && !this.isMissingUsersTableError(saucesError));

      if (hadError) {
        console.warn('Using demo recipes because Supabase recipes failed');
        return this.filterRecipes(this.getDemoRecipes(), query);
      }

      return this.filterRecipes(rows, query);
    } catch (error) {
      console.warn('Using demo recipes because Supabase recipes failed', error);
      return this.filterRecipes(this.getDemoRecipes(), query);
    }
  }

  /** Toutes les sauces disponibles (base de données) */
  static async getSauces(query = ''): Promise<RecipeItem[]> {
    try {
      const all = await this.getRecipes(query);
      return all.filter(item => item.source === 'sauce');
    } catch (e) {
      console.error('[Supabase] getSauces() error', e);
      throw e;
    }
  }

  static async getRecipeById(id: string): Promise<RecipeItem | null> {
    try {
      const { data: recipe, error: recipeError } = await this.init()
        .from('recipes')
        .select('*, chef:chefs(name, avatar)')
        .eq('id', id)
        .maybeSingle();

      if (recipe) return this.normalizeRecipeRow(recipe, 'recipe');
      if (recipeError) console.warn('Recipe detail loading error', recipeError);

      const { data: sauce, error: sauceError } = await this.init()
        .from('sauces')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (sauce) return this.normalizeRecipeRow(sauce, 'sauce');
      if (sauceError) console.warn('Sauce detail loading error', sauceError);
    } catch (error) {
      console.warn('Recipe detail fallback used', error);
    }

    return this.getDemoRecipes().find(recipe => recipe.id === id) ?? this.getDemoRecipes()[0];
  }

  private static isMissingSauceFeedbackTableError(error: { code?: string; message?: string }) {
    const message = error.message?.toLowerCase() ?? '';
    return (
      error.code === 'PGRST205' ||
      message.includes('sauce_likes') ||
      message.includes('sauce_comments') ||
      message.includes('schema cache') ||
      message.includes('does not exist')
    );
  }

  static async isSauceLiked(sauceId: string): Promise<boolean> {
    const session = await this.getSession();
    if (!session?.user?.id) return false;

    const { data, error } = await this.init()
      .from('sauce_likes')
      .select('sauce_id')
      .eq('sauce_id', sauceId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      if (this.isMissingSauceFeedbackTableError(error)) return false;
      throw new Error(this.mapAuthError(error));
    }

    return !!data;
  }

  static async getLikedSauceIds(): Promise<string[]> {
    const session = await this.getSession();
    if (!session?.user?.id) return [];

    const { data, error } = await this.init()
      .from('sauce_likes')
      .select('sauce_id')
      .eq('user_id', session.user.id);

    if (error) {
      if (this.isMissingSauceFeedbackTableError(error)) return [];
      throw new Error(this.mapAuthError(error));
    }

    return (data ?? []).map((row: any) => row.sauce_id);
  }

  static async toggleSauceLike(sauce: Pick<RecipeItem, 'id' | 'likes'>): Promise<{ liked: boolean; likes: number }> {
    const session = await this.getSession();
    if (!session?.user?.id) throw new Error('Connectez-vous pour liker cette sauce.');

    const liked = await this.isSauceLiked(sauce.id);
    const nextLikes = Math.max((sauce.likes ?? 0) + (liked ? -1 : 1), 0);

    if (liked) {
      const { error } = await this.init()
        .from('sauce_likes')
        .delete()
        .eq('sauce_id', sauce.id)
        .eq('user_id', session.user.id);
      if (error) throw new Error(this.mapAuthError(error));
    } else {
      const { error } = await this.init()
        .from('sauce_likes')
        .insert({ sauce_id: sauce.id, user_id: session.user.id });
      if (error) throw new Error(this.mapAuthError(error));
    }

    const { error: updateError } = await this.init()
      .from('sauces')
      .update({ likes: nextLikes })
      .eq('id', sauce.id);

    if (updateError && !this.isMissingSauceFeedbackTableError(updateError)) {
      throw new Error(this.mapAuthError(updateError));
    }

    // Send notification to sauce chef when liked (only when new like, not when unlike)
    if (!liked) {
      try {
        const { data: sauceData, error: sauceError } = await this.init()
          .from('sauces')
          .select('title, chef_id')
          .eq('id', sauce.id)
          .maybeSingle();

        if (!sauceError && sauceData?.chef_id) {
          const { data: chefData, error: chefError } = await this.init()
            .from('chefs')
            .select('user_id, name')
            .eq('id', sauceData.chef_id)
            .maybeSingle();

          if (!chefError && chefData?.user_id && chefData.user_id !== session.user.id) {
            const profile = await this.ensureUserProfile(session.user);
            const likerName = profile.name || 'Un utilisateur';
            await this.createNotification(
              chefData.user_id,
              `${sauceData.title} a reçu un like`,
              `${likerName} a aimé votre sauce.`,
              `/sauce/${sauce.id}`
            );
          }
        }
      } catch (notificationError) {
        console.warn('Unable to create sauce like notification', notificationError);
      }
    }

    return { liked: !liked, likes: nextLikes };
  }

  static async getSauceComments(sauceId: string): Promise<SauceComment[]> {
    const { data, error } = await this.init()
      .from('sauce_comments')
      .select('*')
      .eq('sauce_id', sauceId)
      .order('created_at', { ascending: false });

    if (error) {
      if (this.isMissingSauceFeedbackTableError(error)) return [];
      throw new Error(this.mapAuthError(error));
    }

    const comments = (data ?? []) as SauceComment[];
    if (!comments.length) return [];

    const userIds = [...new Set(comments.map(comment => comment.user_id).filter(Boolean))];
    if (!userIds.length) return comments;

    const { data: usersData, error: usersError } = await this.init()
      .from('users')
      .select('id, name, avatar')
      .in('id', userIds);

    if (usersError) {
      console.warn('Unable to load sauce comment authors', usersError);
      return comments;
    }

    const usersById = new Map((usersData ?? []).map((user: any) => [user.id, user]));
    return comments.map(comment => ({
      ...comment,
      user: usersById.get(comment.user_id) ?? null
    }));
  }

  static async addSauceComment(sauceId: string, content: string): Promise<SauceComment> {
    const session = await this.getSession();
    if (!session?.user) throw new Error('Connectez-vous pour commenter cette sauce.');

    const profile = await this.ensureUserProfile(session.user);
    const { data, error } = await this.init()
      .from('sauce_comments')
      .insert({
        sauce_id: sauceId,
        user_id: session.user.id,
        content: content.trim()
      })
      .select('*')
      .single();

    if (error) throw new Error(this.mapAuthError(error));

    const createdComment = {
      ...(data as SauceComment),
      user: {
        name: profile.name,
        avatar: profile.avatar
      }
    };

    try {
      const { data: sauceData, error: sauceError } = await this.init()
        .from('sauces')
        .select('chef_id')
        .eq('id', sauceId)
        .maybeSingle();

      if (!sauceError && sauceData?.chef_id) {
        const { data: chefData, error: chefError } = await this.init()
          .from('chefs')
          .select('user_id')
          .eq('id', sauceData.chef_id)
          .maybeSingle();

        if (!chefError && chefData?.user_id && chefData.user_id !== session.user.id) {
          await this.createNotification(
            chefData.user_id,
            'Nouveau commentaire sur votre sauce',
            `${profile.name} a commenté votre sauce.`,
            `/sauce/${sauceId}`
          );
        }
      }
    } catch (notificationError) {
      console.warn('Unable to create sauce comment notification', notificationError);
    }

    return createdComment;
  }

  static async getItemFavoriteCount(itemId: string, itemType: 'recipe' | 'sauce'): Promise<number> {
    const { count, error } = await this.init()
      .from('recipe_favorites')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('item_type', itemType);

    if (error) {
      if (this.isMissingFavoritesTableError(error)) return 0;
      console.warn('Unable to count favorites', error);
      return 0;
    }
    return count ?? 0;
  }

  static async getSauceCommentsGrouped(sauceIds: string[]): Promise<Record<string, SauceComment[]>> {
    if (!sauceIds.length) return {};

    const { data, error } = await this.init()
      .from('sauce_comments')
      .select('*')
      .in('sauce_id', sauceIds)
      .order('created_at', { ascending: false });

    if (error) {
      if (this.isMissingSauceFeedbackTableError(error)) return {};
      throw new Error(this.mapAuthError(error));
    }

    const comments = (data ?? []) as SauceComment[];
    const userIds = [...new Set(comments.map(comment => comment.user_id).filter(Boolean))];
    let usersById = new Map<string, { name?: string | null; avatar?: string | null }>();

    if (userIds.length) {
      const { data: usersData } = await this.init()
        .from('users')
        .select('id, name, avatar')
        .in('id', userIds);
      usersById = new Map((usersData ?? []).map((user: any) => [user.id, user]));
    }

    return comments.reduce<Record<string, SauceComment[]>>((acc, comment) => {
      const enriched = {
        ...comment,
        user: comment.user_id ? usersById.get(comment.user_id) ?? null : null
      };
      acc[comment.sauce_id] = [...(acc[comment.sauce_id] ?? []), enriched];
      return acc;
    }, {});
  }

  static async getSauceFeedbackForChef(userId: string): Promise<SauceFeedbackSummary[]> {
    const sauces = await this.getSaucesByChef(userId);
    if (!sauces.length) return [];

    const commentsBySauce = await this.getSauceCommentsGrouped(sauces.map(sauce => sauce.id));

    return sauces.map(sauce => ({
      sauceId: sauce.id,
      title: sauce.title,
      views: sauce.views ?? 0,
      likes: sauce.likes ?? 0,
      favorites: 0,
      comments: commentsBySauce[sauce.id] ?? []
    }));
  }

  static async replyToSauceComment(commentId: string, reply: string): Promise<SauceComment> {
    const session = await this.getSession();
    if (!session?.user) throw new Error('Connectez-vous pour répondre.');

    const chef = await this.getChefByUserId(session.user.id);
    if (!chef) throw new Error('Seuls les chefs peuvent répondre aux commentaires.');

    const { data: comment, error: commentError } = await this.init()
      .from('sauce_comments')
      .select('*, sauces(chef_id, title)')
      .eq('id', commentId)
      .maybeSingle();

    if (commentError || !comment) throw new Error('Commentaire introuvable.');

    const sauceChefId = (comment as any).sauces?.chef_id;
    if (sauceChefId !== chef.id) {
      throw new Error('Vous ne pouvez répondre qu\'aux commentaires de vos sauces.');
    }

    const { data, error } = await this.init()
      .from('sauce_comments')
      .update({
        chef_reply: reply.trim(),
        chef_reply_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) throw new Error(this.mapAuthError(error));

    const updated = data as SauceComment;

    if (comment.user_id && comment.user_id !== session.user.id) {
      const sauceTitle = (comment as any).sauces?.title || 'votre sauce';
      await this.createNotification(
        comment.user_id,
        'Réponse du chef',
        `${chef.name} a répondu à votre commentaire sur ${sauceTitle}.`,
        `/sauce/${comment.sauce_id}`
      );
    }

    const userIds = comment.user_id ? [comment.user_id] : [];
    if (userIds.length) {
      const { data: usersData } = await this.init()
        .from('users')
        .select('id, name, avatar')
        .in('id', userIds);
      const usersById = new Map((usersData ?? []).map((u: any) => [u.id, u]));
      updated.user = usersById.get(comment.user_id) ?? null;
    }

    return updated;
  }

  static async incrementViews(item: Pick<RecipeItem, 'id' | 'source'>): Promise<number> {
    const table = item.source === 'sauce' ? 'sauces' : 'recipes';

    const { data: current, error: readError } = await this.init()
      .from(table)
      .select('views')
      .eq('id', item.id)
      .maybeSingle();

    if (readError) {
      console.warn('Unable to read views', readError);
      return 0;
    }

    const nextViews = (current?.views ?? 0) + 1;
    const { error: updateError } = await this.init()
      .from(table)
      .update({ views: nextViews })
      .eq('id', item.id);

    if (updateError) {
      console.warn('Unable to increment views', updateError);
      return current?.views ?? 0;
    }

    return nextViews;
  }

  static async downloadVideo(url: string, filename = 'allochef-video.mp4') {
    try {
      // If the URL is a signed Supabase URL (contains token=), avoid appending params which would break the signature.
      let downloadUrl = url;
      const isSupabase = url.includes('supabase.co');
      const looksSigned = url.includes('token=') || url.includes('signed');
      if (isSupabase && !looksSigned && !url.includes('download=')) {
        downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(filename)}`;
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (e) {
      console.error('Erreur de téléchargement', e);
      window.open(url, '_blank');
    }
  }

  private static isMissingNotificationsTableError(error: { code?: string; message?: string }) {
    const message = error.message?.toLowerCase() ?? '';
    return (
      error.code === 'PGRST205' ||
      message.includes('notifications') ||
      message.includes('schema cache') ||
      message.includes('does not exist')
    );
  }

  static async getNotifications(): Promise<NotificationItem[]> {
    const session = await this.getSession();
    if (!session?.user?.id) return [];

    const { data, error } = await this.init()
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (this.isMissingNotificationsTableError(error)) return [];
      throw new Error(this.mapAuthError(error));
    }

    return (data ?? []) as NotificationItem[];
  }



  static async markNotificationRead(notificationId: string): Promise<void> {
    if (!notificationId) return;
    const session = await this.getSession();
    if (!session?.user?.id) return;

    const { error } = await this.init()
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', session.user.id);

    if (error && !this.isMissingNotificationsTableError(error)) {
      throw new Error(this.mapAuthError(error));
    }
  }

  static async createNotification(
    userId: string,
    title: string,
    body?: string,
    link?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!userId || !title) return;

    const { error: rpcError } = await this.init().rpc('create_app_notification', {
      p_user_id: userId,
      p_title: title,
      p_body: body ?? null,
      p_link: link ?? null,
      p_metadata: metadata ?? {}
    });

    if (!rpcError) return;

    const { error } = await this.init()
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body: body ?? null,
        link: link ?? null,
        is_read: false,
        metadata: metadata ?? {}
      });

    if (error && !this.isMissingNotificationsTableError(error)) {
      console.warn('Unable to create notification', rpcError.message || error.message);
    }
  }

  static async addRecipe(recipeData: any): Promise<any> {
    const session = await this.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Vous devez être connecté.");

    const chef = await this.getChefByUserId(userId);
    if (!chef) throw new Error("Profil Chef introuvable.");

    const { data, error } = await this.init()
      .from('recipes')
      .insert({
        chef_id: chef.id,
        title: recipeData.title,
        description: recipeData.description,
        difficulty: recipeData.difficulty || 'Facile',
        duration: recipeData.duration || 30,
        base_servings: recipeData.base_servings || 4,
        ingredients: recipeData.ingredients || [],
        steps: recipeData.steps || [],
        image_url: recipeData.image_url || null,
        video_url: recipeData.video_url || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(this.mapAuthError(error));
    return data;
  }

  static async addSauce(sauceData: any): Promise<any> {
    const session = await this.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Vous devez être connecté.");

    const chef = await this.getChefByUserId(userId);
    if (!chef) throw new Error("Profil Chef introuvable.");
    // First attempt: include chef_id (preferred). If the DB doesn't have that column,
    // PostgREST returns a 42703 error (column does not exist). In that case retry
    // inserting without chef_id so the UI can continue to create sauces until the
    // remote migration is applied.
    try {
      const attempt = await this.init()
        .from('sauces')
        .insert({
          chef_id: chef.id,
          title: sauceData.title,
          category: normalizeSauceCategory(sauceData.category),
          description: sauceData.description || null,
          difficulty: sauceData.difficulty || 'Facile',
          duration: sauceData.duration || 30,
          base_servings: sauceData.base_servings || 4,
          ingredients: sauceData.ingredients || [],
          steps: sauceData.steps || [],
          utensils: sauceData.utensils || [],
          image_url: sauceData.image_url || null,
          video_url: sauceData.video_url || null,
          status: 'pending'
        })
        .select()
        .single();

      if (!attempt.error) {
        return attempt.data;
      }

      // If the error indicates missing chef_id column, fall back to inserting without it.
      const err = attempt.error as any;
      console.warn('[Supabase] addSauce initial insert error:', err);
      if (err?.message?.toLowerCase?.().includes('chef_id') || err?.code === '42703') {
        console.warn('[Supabase] chef_id column missing on remote DB; retrying insert without chef_id');
        const fallback = await this.init()
          .from('sauces')
          .insert({
            title: sauceData.title,
            category: normalizeSauceCategory(sauceData.category),
            description: sauceData.description || null,
            difficulty: sauceData.difficulty || 'Facile',
            duration: sauceData.duration || 30,
            base_servings: sauceData.base_servings || 4,
            ingredients: sauceData.ingredients || [],
            steps: sauceData.steps || [],
            utensils: sauceData.utensils || [],
            image_url: sauceData.image_url || null,
            video_url: sauceData.video_url || null,
            status: 'pending'
          })
          .select()
          .single();

        if (fallback.error) {
          console.error('[Supabase] addSauce fallback error:', fallback.error);
          throw new Error(this.mapAuthError(fallback.error));
        }
        return fallback.data;
      }

      // Other errors: surface to caller
      throw new Error(this.mapAuthError(err));
    } catch (ex: any) {
      console.error('[Supabase] addSauce caught exception:', ex);
      throw new Error(ex?.message || 'Erreur lors de la création de la sauce.');
    }
  }

  private static getLocalFavoriteKeys(userId = 'guest'): string[] {
    const raw = localStorage.getItem(`${FAVORITES_STORAGE_KEY}_${userId}`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static setLocalFavoriteKeys(keys: string[], userId = 'guest') {
    localStorage.setItem(`${FAVORITES_STORAGE_KEY}_${userId}`, JSON.stringify([...new Set(keys)]));
  }

  private static isMissingFavoritesTableError(error: { code?: string; message?: string }) {
    const message = error.message?.toLowerCase() ?? '';
    return (
      error.code === 'PGRST205' ||
      message.includes('recipe_favorites') ||
      message.includes('schema cache') ||
      message.includes('does not exist')
    );
  }

  static async getFavoriteKeys(): Promise<string[]> {
    const session = await this.getSession();
    const userId = session?.user?.id ?? 'guest';

    if (!session) return this.getLocalFavoriteKeys(userId);

    const { data, error } = await this.init()
      .from('recipe_favorites')
      .select('item_id, item_type')
      .eq('user_id', userId);

    if (error) {
      if (this.isMissingFavoritesTableError(error)) {
        return this.getLocalFavoriteKeys(userId);
      }
      throw new Error(this.mapAuthError(error));
    }

    const keys = (data ?? []).map((row: any) => `${row.item_type}:${row.item_id}`);
    this.setLocalFavoriteKeys(keys, userId);
    return keys;
  }

  static async getFavoriteItems(): Promise<RecipeItem[]> {
    const keys = await this.getFavoriteKeys();
    if (!keys.length) return [];

    const allItems = await this.getRecipes();
    const favoriteKeys = new Set(keys);
    return allItems.filter(item => favoriteKeys.has(this.getFavoriteKey(item)));
  }

  static async toggleFavorite(item: Pick<RecipeItem, 'id' | 'source'>): Promise<boolean> {
    const session = await this.getSession();
    const userId = session?.user?.id ?? 'guest';
    const key = this.getFavoriteKey(item);
    const localKeys = this.getLocalFavoriteKeys(userId);
    const isAlreadyFavorite = localKeys.includes(key);

    if (!session) {
      const next = isAlreadyFavorite
        ? localKeys.filter(existing => existing !== key)
        : [...localKeys, key];
      this.setLocalFavoriteKeys(next, userId);
      return !isAlreadyFavorite;
    }

    try {
      if (isAlreadyFavorite) {
        const { error } = await this.init()
          .from('recipe_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('item_type', item.source)
          .eq('item_id', item.id);

        if (error) throw error;
        this.setLocalFavoriteKeys(localKeys.filter(existing => existing !== key), userId);
        if (session?.user?.id) {
          const profile = await this.getUserProfile(session.user.id);
          const currentFavorites = profile?.favorites_count ?? 0;
          await this.updateUser(session.user.id, {
            favorites_count: Math.max(currentFavorites - 1, 0)
          });
        }
        return false;
      }

      const { error } = await this.init()
        .from('recipe_favorites')
        .upsert({
          user_id: userId,
          item_type: item.source,
          item_id: item.id
        });

      if (error) throw error;
      this.setLocalFavoriteKeys([...localKeys, key], userId);
      if (session?.user?.id) {
        const profile = await this.getUserProfile(session.user.id);
        const currentFavorites = profile?.favorites_count ?? 0;
        await this.updateUser(session.user.id, {
          favorites_count: currentFavorites + 1
        });
      }
      return true;
    } catch (error: any) {
      if (!this.isMissingFavoritesTableError(error)) {
        throw new Error(this.mapAuthError(error));
      }

      const next = isAlreadyFavorite
        ? localKeys.filter(existing => existing !== key)
        : [...localKeys, key];
      this.setLocalFavoriteKeys(next, userId);
      return !isAlreadyFavorite;
    }
  }

  // ADMIN
  private static async assertAdmin(): Promise<UserProfile> {
    const now = Date.now();
    if (this.adminSessionCache && this.adminSessionCache.until > now) {
      return this.adminSessionCache.profile;
    }

    if (!this.adminAssertPromise) {
      this.adminAssertPromise = (async () => {
        const session = await this.getSession();
        if (!session?.user) throw new Error('Connexion requise.');
        const profile = await this.getUserProfile(session.user.id);
        if (!profile?.is_admin && profile?.role !== 'admin') {
          throw new Error('Accès réservé aux administrateurs.');
        }
        this.adminSessionCache = { profile, until: Date.now() + this.ADMIN_CACHE_MS };
        return profile;
      })().finally(() => {
        this.adminAssertPromise = null;
      });
    }

    return this.adminAssertPromise;
  }

  static async getAdminStats(force = false): Promise<AdminStats> {
    await this.assertAdmin();

    const now = Date.now();
    if (!force && this.adminStatsCache && this.adminStatsCache.until > now) {
      return this.adminStatsCache.data;
    }

    const sb = this.init();
    const [
      usersRes,
      chefsRes,
      pendingChefsRes,
      pendingRecipesRes,
      pendingSaucesRes,
      pendingOrdersRes
    ] = await Promise.all([
      sb.from('users').select('id', { count: 'exact', head: true }),
      sb.from('chefs').select('id', { count: 'exact', head: true }),
      sb.from('chefs').select('id', { count: 'exact', head: true }).eq('is_verified', false),
      sb.from('recipes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('sauces').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    const data: AdminStats = {
      totalUsers: usersRes.count ?? 0,
      totalChefs: chefsRes.count ?? 0,
      pendingChefs: pendingChefsRes.count ?? 0,
      pendingContent: (pendingRecipesRes.count ?? 0) + (pendingSaucesRes.count ?? 0),
      pendingOrders: pendingOrdersRes.count ?? 0
    };

    this.adminStatsCache = { data, until: now + this.ADMIN_CACHE_MS };
    return data;
  }

  static async getAllUsers(): Promise<UserProfile[]> {
    await this.assertAdmin();
    const { data, error } = await this.init()
      .from('users')
      .select('id, email, name, avatar, role, is_admin, is_banned, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(this.mapAuthError(error));
    return (data ?? []).map(u => ({
      ...u,
      bio: null,
      favorites_count: 0,
      cooking_level: 'Débutant',
      followed_count: 0,
      role: u.role ?? (u.is_admin ? 'admin' : 'user')
    })) as UserProfile[];
  }

  static async setUserBanned(userId: string, banned: boolean): Promise<void> {
    await this.assertAdmin();
    const { error } = await this.init()
      .from('users')
      .update({ is_banned: banned })
      .eq('id', userId);
    if (error) throw new Error(this.mapAuthError(error));
    this.adminStatsCache = null;
  }

  static async getAllChefsWithUsers(): Promise<ChefWithUser[]> {
    await this.assertAdmin();
    const { data, error } = await this.init()
      .from('chefs')
      .select('id, name, specialty, avatar, is_verified, user_id, created_at, user:users(id, email, name, role, is_admin)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(this.mapAuthError(error));
    return (data ?? []).map((row: any) => ({
      ...row,
      avatar: this.resolveAvatarUrl(row.avatar, row.name),
      user: row.user ? {
        ...row.user,
        role: row.user.role ?? (row.user.is_admin ? 'admin' : 'user')
      } : null
    })) as ChefWithUser[];
  }

  static async setChefVerified(chefId: string, verified: boolean): Promise<void> {
    await this.assertAdmin();
    const { error } = await this.init()
      .from('chefs')
      .update({ is_verified: verified })
      .eq('id', chefId);
    if (error) throw new Error(this.mapAuthError(error));

    const { data: chef } = await this.init()
      .from('chefs')
      .select('user_id, name')
      .eq('id', chefId)
      .maybeSingle();

    if (chef?.user_id) {
      await this.createNotification(
        chef.user_id,
        verified ? 'Compte chef validé' : 'Validation chef retirée',
        verified
          ? 'Félicitations ! Votre compte chef a été validé par l\'administration.'
          : 'Votre validation chef a été retirée. Contactez le support.',
        '/tabs/tab5'
      );
    }
    this.adminStatsCache = null;
  }

  static async getPendingContent(): Promise<{ recipes: RecipeItem[]; sauces: RecipeItem[] }> {
    await this.assertAdmin();

    const [{ data: recipes }, { data: sauces }] = await Promise.all([
      this.init()
        .from('recipes')
        .select('id, title, description, duration, status, image_url, video_url, ingredients, steps, chef:chefs(name, avatar)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
      this.init()
        .from('sauces')
        .select('id, title, description, duration, status, image_url, video_url, ingredients, steps, chef:chefs(name, avatar)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    return {
      recipes: (recipes ?? []).map(r => this.normalizeRecipeRow(r, 'recipe')),
      sauces: (sauces ?? []).map(s => this.normalizeRecipeRow(s, 'sauce'))
    };
  }

  static async updateContentStatus(
    id: string,
    source: 'recipe' | 'sauce',
    status: 'published' | 'rejected' | 'pending'
  ): Promise<void> {
    await this.assertAdmin();
    const table = source === 'sauce' ? 'sauces' : 'recipes';
    const { error } = await this.init()
      .from(table)
      .update({ status })
      .eq('id', id);
    if (error) throw new Error(this.mapAuthError(error));
    this.adminStatsCache = null;
  }

  // ORDERS
  private static estimateIngredientPrice(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 500 + (Math.abs(hash) % 4500);
  }

  static buildCartFromIngredients(
    ingredients: RecipeIngredient[]
  ): OrderItemRecord[] {
    return ingredients.map(ing => ({
      name: ing.name,
      quantity: ing.quantity != null ? String(ing.quantity) : '1',
      unit: ing.unit || 'pcs',
      price: this.estimateIngredientPrice(ing.name)
    }));
  }

  static async createOrder(
    recipeName: string,
    recipeId: string,
    items: OrderItemRecord[]
  ): Promise<OrderRecord> {
    const session = await this.getSession();
    if (!session?.user) throw new Error('Connectez-vous pour commander.');

    const total = items.reduce((sum, item) => sum + item.price, 0);
    const { data: order, error: orderError } = await this.init()
      .from('orders')
      .insert({
        user_id: session.user.id,
        recipe_name: recipeName,
        recipe_id: recipeId,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        total,
        item_count: items.length
      })
      .select()
      .single();

    if (orderError) throw new Error(this.mapAuthError(orderError));

    const orderItems = items.map(item => ({
      order_id: order.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price
    }));

    const { error: itemsError } = await this.init()
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error(this.mapAuthError(itemsError));

    return { ...order, items } as OrderRecord;
  }

  static async getUserOrders(): Promise<OrderRecord[]> {
    const session = await this.getSession();
    if (!session?.user) return [];

    const { data, error } = await this.init()
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Orders loading error', error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      ...row,
      items: row.order_items ?? []
    })) as OrderRecord[];
  }

  static async getAllOrders(): Promise<OrderRecord[]> {
    await this.assertAdmin();
    const { data, error } = await this.init()
      .from('orders')
      .select('id, user_id, recipe_id, recipe_name, total, status, date, item_count, created_at, order_items(id, name, quantity, unit, price)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(this.mapAuthError(error));
    return (data ?? []).map((row: any) => ({
      ...row,
      items: row.order_items ?? []
    })) as OrderRecord[];
  }

  static async updateOrderStatus(
    orderId: string,
    status: OrderRecord['status']
  ): Promise<void> {
    await this.assertAdmin();
    const { error } = await this.init()
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) throw new Error(this.mapAuthError(error));
    this.adminStatsCache = null;
  }

  // STORAGE
  static async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;

    const { error } = await this.init()
      .storage
      .from('profile-avatars')
      .upload(fileName, file, { upsert: true });

    if (error) throw new Error(this.mapAuthError(error));

    // Prefer signed URL to avoid 403 for private buckets
    const { data: signed } = await this.init()
      .storage
      .from('profile-avatars')
      .createSignedUrl(fileName, 60 * 60 * 24); // 24h

    return signed?.signedUrl ?? '';
  }

  static async deleteAvatar(path: string) {
    const { error } = await this.init()
      .storage
      .from('profile-avatars')
      .remove([path]);

    if (error) throw new Error(this.mapAuthError(error));
  }

  static async uploadSauceMedia(userId: string, file: File, kind: 'image' | 'video'): Promise<string> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || (kind === 'image' ? 'jpg' : 'mp4');
    const fileName = `${userId}/${kind}/${crypto.randomUUID()}.${fileExt}`;

    const { error } = await this.init()
      .storage
      .from('sauce-media')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4')
      });

    if (error) throw new Error(this.mapAuthError(error));

    // Return a signed URL (valid 24h) to avoid access denied on private buckets
    const { data: signed } = await this.init()
      .storage
      .from('sauce-media')
      .createSignedUrl(fileName, 60 * 60 * 24);

    return signed?.signedUrl ?? '';
  }
}
