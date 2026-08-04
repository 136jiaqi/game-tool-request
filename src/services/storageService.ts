import type {Lang,Submission} from '../types'
import {createId} from '../utils/id'
const KEYS={submissions:'xmodhub_tool_request_submissions',anonymous:'xmodhub_tool_request_anonymous_id',language:'xmodhub_tool_request_language'}
export const storage={getSubmissions:():Submission[]=>JSON.parse(localStorage.getItem(KEYS.submissions)||'[]') as Submission[],saveSubmissions:(v:Submission[])=>localStorage.setItem(KEYS.submissions,JSON.stringify(v)),anonymousId:()=>{let id=localStorage.getItem(KEYS.anonymous);if(!id){id=`anon_${createId()}`;localStorage.setItem(KEYS.anonymous,id)}return id},getLanguage:()=>localStorage.getItem(KEYS.language) as Lang|null,setLanguage:(v:Lang)=>localStorage.setItem(KEYS.language,v),clear:()=>Object.values(KEYS).forEach(k=>localStorage.removeItem(k))}
