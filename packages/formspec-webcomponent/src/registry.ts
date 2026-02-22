import { ComponentPlugin } from './types';

export class ComponentRegistry {
    private plugins: Map<string, ComponentPlugin> = new Map();

    register(plugin: ComponentPlugin) {
        this.plugins.set(plugin.type, plugin);
    }

    get(type: string): ComponentPlugin | undefined {
        return this.plugins.get(type);
    }
}

export const globalRegistry = new ComponentRegistry();
