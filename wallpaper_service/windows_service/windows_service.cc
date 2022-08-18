#include "napi.h"
#include <windows.h>
#include <dwmapi.h>
#pragma comment (lib, "dwmapi.lib")

HWND foundWindow = nullptr;
Napi::Env env = nullptr;
Napi::Function cb;
std::string data;

BOOL CALLBACK isWindow(HWND hwnd, LPARAM lParam){
  HWND p = FindWindowEx(hwnd, NULL, "SHELLDLL_DefView", NULL);
	if (p) {
		foundWindow = FindWindowEx(NULL, hwnd, "WorkerW", NULL);
        return false;
	}
	return true;
}

void setWallpaper(const Napi::CallbackInfo& args) {
  Napi::Env enva = args.Env();

  HWND hwnd = (HWND)(LONG_PTR)args[0].As<Napi::Number>().Int32Value();;
  POINT point = {};
  point.x = (int)args[1].As<Napi::Number>().Int32Value();
  point.y = (int)args[2].As<Napi::Number>().Int32Value();;

  HWND progman = FindWindow("Progman", NULL);
  SendMessageTimeout(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, nullptr);

  EnumWindows(isWindow, NULL);

  SetWindowLong(hwnd, GWL_EXSTYLE, WS_EX_LAYERED);
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
        data += "{\"pos\": [" + std::to_string(win.ptMaxPosition.x) + "," + 
          std::to_string(win.ptMaxPosition.y) + "],";

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

Napi::Object Initialize(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "setWallpaper"), Napi::Function::New(env, setWallpaper));
  exports.Set(Napi::String::New(env, "onAppStateChange"), Napi::Function::New(env, onAppStateChange));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Initialize)