#include "napi.h"
#include <windows.h>
#include <dwmapi.h>
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <endpointvolume.h>
#include <psapi.h>
#pragma comment (lib, "dwmapi.lib")

HWND foundWindow = nullptr;
Napi::Env env = nullptr;
Napi::Function cb;
std::string data;
IAudioSessionManager2* pSessionManager;

BOOL CALLBACK isWindow(HWND hwnd, LPARAM lParam){
  HWND p = FindWindowEx(hwnd, NULL, "SHELLDLL_DefView", NULL);
	if (p) {
		foundWindow = FindWindowEx(NULL, hwnd, "WorkerW", NULL);
        return false;
	}
	return true;
}

void setWallpaper(const Napi::CallbackInfo& args) {
  HWND hwnd = (HWND)(LONG_PTR)args[0].As<Napi::Number>().Int32Value();;
  POINT point = {};
  point.x = (int)args[1].As<Napi::Number>().Int32Value();
  point.y = (int)args[2].As<Napi::Number>().Int32Value();;

  HWND progman = FindWindow("Progman", NULL);
  SendMessageTimeout(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, nullptr);

  EnumWindows(isWindow, NULL);

  SetParent(hwnd, foundWindow);
  ScreenToClient(foundWindow, &point);
  SetWindowPos(hwnd, 0, point.x, point.y, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
}

BOOL isWindowFullscreen(HWND hwnd) {
  HMONITOR hMon = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONULL);
  if(hMon != NULL){
    MONITORINFO mon;
    mon.cbSize = sizeof(MONITORINFO);
    GetMonitorInfo(hMon, &mon);

    RECT rect;
    return (GetWindowRect(hwnd, &rect) && mon.rcMonitor.left == rect.left && mon.rcMonitor.top == rect.top
            && mon.rcMonitor.right == rect.right && mon.rcMonitor.bottom == rect.bottom);
  }
  return false;
}

BOOL IsWindowCloaked(HWND hwnd) {
 BOOL isCloaked = false;
 return (SUCCEEDED(DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED,&isCloaked, sizeof(isCloaked))) && isCloaked);
}

BOOL CALLBACK windowState(HWND hwnd, LPARAM lParam){
  LONG style = GetWindowLong(hwnd, GWL_EXSTYLE);
  if(IsWindowVisible(hwnd) && !IsIconic(hwnd) && !IsWindowCloaked(hwnd) 
    && !(style & WS_EX_TOOLWINDOW) && GetWindowTextLength(hwnd) != 0){
      
      WINDOWPLACEMENT win;
      win.length = sizeof(WINDOWPLACEMENT);
      
      if(GetWindowPlacement(hwnd, &win)){
        if(data.length() != 0){
          data += ", ";
        }
        data += "{\"pos\": [" + std::to_string(win.rcNormalPosition.left) + "," + 
          std::to_string(win.rcNormalPosition.top) + "],";

        if(win.showCmd == SW_MAXIMIZE || isWindowFullscreen(hwnd)){
          data += " \"fullscreen\": true}";
        }else{
          data += " \"fullscreen\": false}";
        }
      }
  }
  return true;
}

void getWindowsApplicationState() {
  data = ""; 
  EnumWindows(windowState, NULL);
  data = "[" + data + "]";
  cb.Call(env.Global(), {Napi::String::New(env, data.c_str())});
}

void CALLBACK appEvent(HWINEVENTHOOK hWinEventHook, DWORD event, HWND hwnd, LONG idObject, LONG idChild, DWORD idEventThread, DWORD dwmsEventTime) {
  if((event == EVENT_OBJECT_LOCATIONCHANGE && idObject == OBJID_WINDOW && hwnd != NULL) || (event == EVENT_OBJECT_DESTROY && idObject == OBJID_CLIENT)){
    getWindowsApplicationState();
  }
}

void onAppStateChange(const Napi::CallbackInfo& info) {
  env = info.Env();
  cb = info[0].As<Napi::Function>();
  
  SetWinEventHook(EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE, NULL, appEvent, 0, 0, WINEVENT_OUTOFCONTEXT);
  SetWinEventHook(EVENT_OBJECT_DESTROY, EVENT_OBJECT_DESTROY, NULL, appEvent, 0, 0, WINEVENT_OUTOFCONTEXT);

  MSG msg;
  while(true){
    GetMessage(&msg, NULL, 0, 0);
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }
}

void initializeAudioMonitor(const Napi::CallbackInfo& info) {
  IMMDeviceEnumerator *pEnumerator;
  IMMDevice *pDevice;
  CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_INPROC_SERVER,
                   __uuidof(IMMDeviceEnumerator),(void**)&pEnumerator);
  pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice);
  pDevice->Activate(__uuidof(IAudioSessionManager2),CLSCTX_ALL, NULL, (void**)&pSessionManager);
}

//Returns true if an active audio state exists that is not Wallpaper Alive/Electron.
//Note: Just because an audio state is active does not mean there is audible sound.
//ie. a song which is playing but currently has no audio
//Additional Note: Audio sessions tend to remain active for a few seconds after being paused
//but closing the video immediately removes the session.
Napi::Boolean isSystemAudioPlaying(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  IAudioSessionEnumerator* pSessionList;
  IAudioSessionControl* pSessionControl;
  IAudioSessionControl2* sessionControl2;
  AudioSessionState state;
  int sessionCount = 0;
  bool audioPlaying = false;
  HANDLE hProcess;

  pSessionManager->GetSessionEnumerator(&pSessionList);
  pSessionList->GetCount(&sessionCount);
  
  //Enumerate over audio sessions
  for (int i = 0; i < sessionCount; i++) {
    pSessionList->GetSession(i, &pSessionControl);
    pSessionControl->GetState(&state);
    //Get process id of active audio sessions
    if(state == AudioSessionStateActive) {
      pSessionControl->QueryInterface(__uuidof(IAudioSessionControl2), (void**)&sessionControl2);
      DWORD id;
      sessionControl2->GetProcessId(&id);
      //Get process name from process id
      hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, id);
      if(hProcess != NULL){
        HMODULE hMod;
        DWORD cbNeeded;
        char str[32]; 

        if(EnumProcessModules(hProcess, &hMod, sizeof(hMod), &cbNeeded)){
          GetModuleBaseName(hProcess, hMod, str, 32);
          std::string name(str);
          if(name != "electron.exe" && name != "WallpaperAlive.exe"){
            audioPlaying = true;
            break;
          }
        }else{
          audioPlaying = true;
          break;
        }
      }
    }
  }

  CloseHandle(hProcess); 
  return Napi::Boolean::New(env, audioPlaying);
}

Napi::Object Initialize(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "setWallpaper"), Napi::Function::New(env, setWallpaper));
  exports.Set(Napi::String::New(env, "onAppStateChange"), Napi::Function::New(env, onAppStateChange));
  exports.Set(Napi::String::New(env, "initializeAudioMonitor"), Napi::Function::New(env, initializeAudioMonitor));
  exports.Set(Napi::String::New(env, "isSystemAudioPlaying"), Napi::Function::New(env, isSystemAudioPlaying));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Initialize)