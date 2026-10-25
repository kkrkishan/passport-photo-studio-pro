import { PPSPProjectFile } from '../types';

export function createProjectJSON(projectData: Omit<PPSPProjectFile, 'version' | 'software' | 'createdAt'>): string {
  const fullProject: PPSPProjectFile = {
    version: '1.0',
    software: 'Passport Photo Studio Pro',
    createdAt: new Date().toISOString(),
    ...projectData,
  };
  return JSON.stringify(fullProject, null, 2);
}

export function parseProjectJSON(jsonString: string): PPSPProjectFile | null {
  try {
    const parsed = JSON.parse(jsonString) as PPSPProjectFile;
    if (parsed.software !== 'Passport Photo Studio Pro' && !parsed.module) {
      console.warn('Invalid project file format');
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('Error parsing .ppsp project:', err);
    return null;
  }
}
