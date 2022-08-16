#include <node.h>
#include <windows.h>

namespace WindowsDesktop {

using v8::FunctionCallbackInfo;
using v8::Local;
using v8::Object;
using v8::Value;
using v8::Number;

BOOL CALLBACK isWindow(HWND hwnd, LPARAM lParam){
  HWND p = FindWindowEx(hwnd, NULL, "SHELLDLL_DefView", NULL);
	if (p) {
		foundWindow = FindWindowEx(NULL, hwnd, "WorkerW", NULL);
        return false;
	}
	return true;
}

void setWallpaper(const FunctionCallbackInfo<Value>& args) {
  HWND hwnd = (HWND)(LONG_PTR)args[0].As<Number>()->Value();
  POINT point = {};
  point.x = (int)args[1].As<Number>()->Value();
  point.y = (int)args[2].As<Number>()->Value();

  HWND progman = FindWindow("Progman", NULL);
  SendMessageTimeout(progman, 0x052C, 0, 0, SMTO_NORMAL, 1000, nullptr);

  EnumWindows(isWindow, NULL);

  SetWindowLong(hwnd, GWL_EXSTYLE, WS_EX_LAYERED);
  SetParent(hwnd, foundWindow);
  ScreenToClient(foundWindow, &point);
  SetWindowPos(hwnd, 0, point.x, point.y, 0, 0, SWP_NOSIZE | SWP_NOZORDER);
}

void Initialize(Local<Object> exports, Local<Object> module) {
  NODE_SET_METHOD(exports, "setWallpaper", setWallpaper);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize);

} 