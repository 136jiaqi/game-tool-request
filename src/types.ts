export type Lang='zh-CN'|'zh-TW'|'en'
export type ToolType='mod_install'|'game_translation'|'interactive_map'|'screenshot_translation'|'memory_cleanup'|'fps_graphics_master'|'win11_stutter_fix'|'runtime_error_fix'|'stutter_diagnosis'|'graphics_performance_optimization'|'save_tool'|'other'
export type UserStatus='submitted'|'unsupported'|'published'
export interface PublishedTool{toolType:ToolType;languageCode?:string;toolName:string;targetUrl:string;publishedAt:string}
export interface GameInfo{appId:string;gameKey:string;nameEn:string;nameZhCn:string;nameZhTw:string;coverUrl:string;steamUrl:string;releaseStatus:'released'|'coming_soon'|'delisted';supportedLanguages:string[];publishedTools:PublishedTool[]}
export interface RequestItem{requestId:string;toolType:ToolType;targetLanguage?:string;otherDescription?:string;userStatus:UserStatus;internalStatus:string;statusReason?:string;publishedToolUrl?:string;createdAt:string;updatedAt:string}
export interface Submission{submissionId:string;anonymousId:string;appId:string;gameSnapshot:Pick<GameInfo,'gameKey'|'nameEn'|'nameZhCn'|'nameZhTw'|'coverUrl'>;contactType:string;contactValue:string;additionalNote?:string;source:string;pageLanguage:Lang;createdAt:string;items:RequestItem[]}
