/**
 * Parse the Overleaf file tree from the new React-based DOM.
 */
function parseOverleafDomTree(): FileEntry[] {
  const rootUl = document.querySelector('.file-tree-inner ul.file-tree-list');
  if (!rootUl) {
    console.warn('Overleaf file tree not found in the DOM');
    return [];
  }

  const topLevelLis = rootUl.querySelectorAll(':scope > .file-tree-folder-list-inner > li[role="treeitem"]');

  const results: FileEntry[] = [];
  topLevelLis.forEach(li => {
    const entry = parseLi(li as HTMLLIElement);
    if (entry) {
      results.push(entry);
    }
  });

  return results;
}

/**
 * Parses a single <li role="treeitem"> element into a FileEntry.
 */
function parseLi(li: HTMLLIElement): FileEntry | null {
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
      const child = parseLi(subLi as HTMLLIElement);
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
