import type {ToolType} from '../types'
import {PackageCheck,Languages,Map,ScanText,MemoryStick,Gauge,MonitorCog,TriangleAlert,Activity,Blocks} from 'lucide-react'
export const tools:{id:ToolType;icon:typeof PackageCheck}[]=[['mod_install',PackageCheck],['game_translation',Languages],['interactive_map',Map],['screenshot_translation',ScanText],['memory_cleanup',MemoryStick],['fps_graphics_master',Gauge],['win11_stutter_fix',MonitorCog],['runtime_error_fix',TriangleAlert],['stutter_diagnosis',Activity],['other',Blocks]].map(([id,icon])=>({id:id as ToolType,icon:icon as typeof PackageCheck}))
export const languages=['zh-CN','zh-TW','en','ja','ko','fr','de','es-ES','es-419','pt-BR','pt-PT','ru','pl','it','nl','tr','th','vi','id','ar']
