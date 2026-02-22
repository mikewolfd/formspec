export class PathResolver {
  public static resolve(currentPath: string, targetPath: string): string {
    if (targetPath.startsWith('/')) {
        return targetPath.substring(1).replace(/\//g, '.');
    }

    if (!targetPath) return currentPath;

    const currentParts = currentPath.split(/[.\[\]]/).filter(Boolean);
    const targetParts = targetPath.split(/[.\[\]]/).filter(Boolean);

    let resultParts = [...currentParts];
    // For relative paths, we might need to go up
    // But FEL paths like $field are usually relative to current group or absolute
    
    // In Formspec, if it's just a field name, it's in the current group
    if (targetParts.length === 1 && !targetPath.includes('.')) {
        resultParts.pop();
        resultParts.push(targetParts[0]);
    } else {
        // Simple implementation for now: if it's a multi-part path and not absolute, 
        // it's treated as relative to root or we need a better logic.
        // Spec says: "Field references are lexically scoped. Inside a repeatable group, 
        // $sibling resolves within the same repeat instance."
        
        // Let's assume for now that if it contains dots, it's relative to current scope 
        // unless we have a clear way to distinguish.
        return targetPath; 
    }

    return resultParts.join('.');
  }

  public static getParentPath(path: string): string {
    const parts = path.split(/[.\[\]]/).filter(Boolean);
    if (parts.length <= 1) return '';
    
    // If last part was an index [n], we go up one more?
    // path: group[0].field -> parent: group[0]
    // path: group[0] -> parent: (root)
    
    const lastDotIndex = path.lastIndexOf('.');
    const lastBracketIndex = path.lastIndexOf('[');
    
    if (lastDotIndex > lastBracketIndex) {
        return path.substring(0, lastDotIndex);
    } else if (lastBracketIndex !== -1) {
        return path.substring(0, lastBracketIndex);
    }
    
    return '';
  }
}
