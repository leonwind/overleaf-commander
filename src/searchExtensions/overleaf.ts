import {isLocalPage} from '@src/chrome/commands';

declare global {
  interface Window {
    angular: {
      element: (selector: string) => { scope: () => any },
    },
  }
}

export interface OverleafApi {
  getFileTree: () => FileEntry[],
  openFile: (file: FileEntry) => void,
  openGithubSyncModal: () => void,
}

export interface FileEntry {
  id: string,
  name: string,
  selected: boolean,
  type: 'folder' | 'doc' | 'file',
  children?: FileEntry[],
}

interface IdeControllerScope {
  rootFolder: FileEntry,
  $emit: (event: string, elem: any) => void,
}

interface GithubSyncControllerScope {
  openGithubSyncModal: () => void,
}

function withScope<S>(controller: string): () => S {
  return () => window.angular.element(`[ng-controller=${controller}]`).scope();
}

class DomOverleafApi implements OverleafApi {
  getFileTree(): FileEntry[] {
    return this.parseOverleafDomTree();
  }

  openFile(file: FileEntry) {
    const selector = `[data-file-id="${file.id}"] .item-name-button`;
    const button = document.querySelector(selector) as HTMLButtonElement;
    if (button) {
      button.click();
    } else {
      console.warn(`Could not find DOM node for file.id="${file.id}"`);
    }
  }

  openGithubSyncModal() {
    console.warn('Not implemented: openGithubSyncModal()');
  }

  /**
 * Parse the Overleaf file tree from the new React-based DOM.
 */
 parseOverleafDomTree(): FileEntry[] {
  const rootUl = document.querySelector('.file-tree-inner ul.file-tree-list');
  if (!rootUl) {
    console.warn('Overleaf file tree not found in the DOM');
    return [];
  }

  const topLevelLis = rootUl.querySelectorAll(':scope > .file-tree-folder-list-inner > li[role="treeitem"]');

  const results: FileEntry[] = [];
  topLevelLis.forEach(li => {
    const entry = this.parseLi(li as HTMLLIElement);
    if (entry) {
      results.push(entry);
    }
  });

  return results;
}

  /**
 * Parses a single <li role="treeitem"> element into a FileEntry.
 */
  parseLi(li: HTMLLIElement): FileEntry | null {
    const entityDiv = li.querySelector('[data-file-id][data-file-type]');
    if (!entityDiv) {
      return null;
    }

    const fileId = entityDiv.getAttribute('data-file-id') || '';
    let fileType = entityDiv.getAttribute('data-file-type') as FileEntry['type'];
    if (!fileType) {
      fileType = 'file';
    }

    const nameSpan = entityDiv.querySelector('.item-name-button span');
    const fileName = nameSpan ? nameSpan.textContent?.trim() || '' : '';

    let childUl: HTMLUListElement | null = null;

    const next = li.nextElementSibling as HTMLElement | null;
    if (next && next.tagName.toLowerCase() === 'ul') {
      childUl = next as HTMLUListElement;
    }

    const isFolder = fileType === 'folder';
    const children: FileEntry[] = [];
    if (isFolder && childUl) {
      const subLis = childUl.querySelectorAll(':scope > .file-tree-folder-list-inner > li[role="treeitem"]');
      subLis.forEach(subLi => {
        const child = this.parseLi(subLi as HTMLLIElement);
        if (child) {
          children.push(child);
        }
      });
    }

    return {
      id: fileId,
      name: fileName,
      selected: false,
      type: fileType,
      children,
    };
  }
}


class MockOverleafApi implements OverleafApi {
  getFileTree(): FileEntry[] {
    return [
      {
        id: '1', name: 'folder1', selected: false, type: 'folder', children: [
          {id: '4', name: 'file4', selected: false, type: 'file', children: []},
        ],
      },
      {id: '2', name: 'file2', selected: false, type: 'file', children: []},
      {id: '3', name: 'file3', selected: false, type: 'file', children: []},
    ];
  }

  openFile(file: FileEntry) {
    console.log('Open File:', file);
  }

  openGithubSyncModal() {
    console.log('Open Github Modal');
  }
}

export class OverleafApiProvider {
  private static instance: OverleafApi | null = null;

  static get(): OverleafApi {
    if (this.instance === null) {
      if (isLocalPage()) {
        console.log('Running in local dev mode with mock Overleaf api');
        this.instance = new MockOverleafApi();
      } else {
        this.instance = new DomOverleafApi();
      }
    }
    return this.instance;
  }
}
