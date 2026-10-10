// Adaptador de servidor. Não importar na interface nem expor access tokens.
export type GoogleEvent={id:string;etag:string;updated?:string;status?:string;summary?:string;start?:{dateTime?:string;date?:string;timeZone?:string};end?:{dateTime?:string;date?:string;timeZone?:string};recurrence?:string[];recurringEventId?:string;originalStartTime?:{dateTime?:string;date?:string};extendedProperties?:{private?:Record<string,string>}}
export class CalendarApiError extends Error{
  constructor(public status:number){super(status===410?'Cursor expirado: sincronização completa necessária.':status===412?'Evento alterado no Google: resolver conflito antes de sobrescrever.':status===401?'Conexão expirada: renovar autorização.':'Google Calendar indisponível.')}
}
export function googleCalendarClient(accessToken:string,fetcher:typeof fetch=fetch){
  async function request<T>(path:string,method='GET',body?:unknown,etag?:string):Promise<T>{
    if((method==='PATCH'||method==='DELETE')&&(!etag?.trim()||etag.trim()==='*'))throw new Error('Versão do evento ausente: consulte o evento antes de alterar ou excluir.')
    const response=await fetcher(`https://www.googleapis.com/calendar/v3/${path}`,{method,headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)})
    if(!response.ok)throw new CalendarApiError(response.status)
    return (response.status===204?undefined:await response.json()) as T
  }
  return {
    async calendars(){
      const result:{id:string;summary:string;accessRole:string}[]=[];let page:string|undefined
      do{const data=await request<{items?:typeof result;nextPageToken?:string}>(`users/me/calendarList?${new URLSearchParams({maxResults:'250',...(page?{pageToken:page}:{})})}`);result.push(...data.items??[]);page=data.nextPageToken}while(page)
      return result.filter(calendar=>calendar.accessRole==='owner'||calendar.accessRole==='writer')
    },
    async events(calendarId:string,syncToken?:string){
      const result:GoogleEvent[]=[];let page:string|undefined;let nextSyncToken:string|undefined
      do{const data=await request<{items?:GoogleEvent[];nextPageToken?:string;nextSyncToken?:string}>(`calendars/${encodeURIComponent(calendarId)}/events?${new URLSearchParams({maxResults:'2500',showDeleted:'true',singleEvents:'false',...(syncToken?{syncToken}:{}),...(page?{pageToken:page}:{})})}`);result.push(...data.items??[]);page=data.nextPageToken;nextSyncToken=data.nextSyncToken}while(page)
      if(!nextSyncToken)throw new Error('Resposta sem cursor de sincronização; não marcar sincronização completa.')
      return {events:result,syncToken:nextSyncToken}
    },
    get:(calendarId:string,id:string)=>request<GoogleEvent>(`calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`),
    async instance(calendarId:string,parentId:string,originalStart:string){
      const result:GoogleEvent[]=[];let page:string|undefined
      do{const data=await request<{items?:GoogleEvent[];nextPageToken?:string}>(`calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(parentId)}/instances?${new URLSearchParams({originalStart,showDeleted:'true',maxResults:'2500',...(page?{pageToken:page}:{})})}`);result.push(...data.items??[]);page=data.nextPageToken}while(page)
      return result.find(item=>item.originalStartTime?.dateTime&&Date.parse(item.originalStartTime.dateTime)===Date.parse(originalStart))??null
    },
    async create(calendarId:string,localId:string,value:Omit<GoogleEvent,'id'|'etag'>){
      // UUID -> base32hex compatível: o mesmo ID evita duplicatas em retries.
      const id=localId.replace(/-/g,'').toLowerCase()
      if(!/^[0-9a-f]{32}$/.test(id))throw new Error('Identificador local inválido.')
      return request<GoogleEvent>(`calendars/${encodeURIComponent(calendarId)}/events`,'POST',{...value,id})
    },
    update:(calendarId:string,id:string,value:Partial<GoogleEvent>,etag:string)=>request<GoogleEvent>(`calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`,'PATCH',value,etag),
    remove:(calendarId:string,id:string,etag:string,confirmed:boolean)=>{
      if(!confirmed)throw new Error('Exclusão externa exige confirmação explícita.')
      return request<void>(`calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(id)}`,'DELETE',undefined,etag)
    },
  }
}
