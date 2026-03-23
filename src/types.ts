export interface InstagramProfile {
  username: string;
  displayName: string;
  bio: string;
  profilePic: string;
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
  isPrivate: boolean;
  category: string;
  externalUrl?: string;
}
