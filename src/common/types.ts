export type FileNode = FileDir | FileFile;

export interface FileDir {
  type: "dir";
  name: string;
  path: string; // relative path from project root, '' for root
  children?: FileNode[];
}

export interface FileFile {
  type: "file";
  name: string;
  path: string; // relative path from project root
}
