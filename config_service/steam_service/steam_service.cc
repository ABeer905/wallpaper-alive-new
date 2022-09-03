#include "napi.h"
#include "steam_sdk/steam_api.h"
#include "vector"

bool SteamInitialized; 
bool messageListener;
Napi::Env env = nullptr;
Napi::Function cb;
PublishedFileId_t publishField; //File for publishing to workshop

const char *g_Achievements[7] = { //Achievements
  "ACH_LAUNCH",
  "ACH_DESKTOP",
  "ACH_GIF",
  "ACH_CREATOR",
  "ACH_CONSUMER",
  "ACH_CONNOISSEUR",
  "ACH_SUPPORTER",
};
UGCUpdateHandle_t updateHandle;

std::vector<const char*> GetTagList(const char* resStr, const char* typeStr, int tag){
  std::vector<const char*> tag_list;
  tag_list.push_back(resStr);
  tag_list.push_back(typeStr);
  if(tag & (1<<0)) {tag_list.push_back("Miscellaneous");}
  if(tag & (1<<1)) {tag_list.push_back("Absctract");}
  if(tag & (1<<2)) {tag_list.push_back("Aesthetic");}
  if(tag & (1<<3)) {tag_list.push_back("Anime");}
  if(tag & (1<<4)) {tag_list.push_back("Fantasy");}
  if(tag & (1<<5)) {tag_list.push_back("Games");}
  if(tag & (1<<6)) {tag_list.push_back("NSFW");}
  if(tag & (1<<7)) {tag_list.push_back("Outdoors");}
  if(tag & (1<<8)) {tag_list.push_back("Pixel Graphics");}
  if(tag & (1<<9)) {tag_list.push_back("Relaxing");}
  if(tag & (1<<10)) {tag_list.push_back("Sci-Fi");}
  if(tag & (1<<11)) {tag_list.push_back("Space");}
  if(tag & (1<<12)) {tag_list.push_back("Sports");}
  if(tag & (1<<13)) {tag_list.push_back("Vehicles");}
  return tag_list;
}

class CallResultManager{
  public:
	  void CreateItemHelper();
  private:
    void OnItemCreated( CreateItemResult_t *pCallback, bool bIOFailure );
    CCallResult< CallResultManager, CreateItemResult_t > m_CreateItemResult;
};

CallResultManager cManager;

void CallResultManager::CreateItemHelper(){
  SteamAPICall_t call = SteamUGC()->CreateItem(2003310, EWorkshopFileType::k_EWorkshopFileTypeCommunity);
  m_CreateItemResult.Set(call, this, &CallResultManager::OnItemCreated);
  messageListener = true;
  while(messageListener) { 
    SteamAPI_RunCallbacks();
  }
}

void CallResultManager::OnItemCreated( CreateItemResult_t* pCallback, bool bIOFailure ){
  messageListener = false;
  bool success = false;
  const char* msg;

  switch(pCallback->m_eResult) {
    case k_EResultTimeout: msg = "Timed out. Please try again."; break;
    case k_EResultNotLoggedOn: msg = "User not logged on."; break;
    case k_EResultOK: success = true;break;
    default: msg = "An error occured.";break;
  }

  if(success){
    publishField = pCallback->m_nPublishedFileId;
    cb.Call(env.Global(), {Napi::Boolean::New(env, true)});
  }else{
    cb.Call(env.Global(), {Napi::String::New(env, msg)});
  }
}

Napi::Boolean SteamInit(const Napi::CallbackInfo& info){
  Napi::Env enva = info.Env();
  SteamInitialized = SteamAPI_Init();
  return Napi::Boolean::New(enva, SteamInitialized);
}

void SteamShutdown(const Napi::CallbackInfo& info){
  SteamAPI_Shutdown();
}

void UnlockAchievement(const Napi::CallbackInfo& args){
  int index = (int)args[0].As<Napi::Number>().Int32Value();
  if(SteamInitialized){
    SteamUserStats()->SetAchievement(g_Achievements[index]);
    SteamUserStats()->StoreStats();
  }
}

Napi::Boolean CreateItem(const Napi::CallbackInfo& info) {
  if(SteamInitialized){
    env = info.Env();
    cb = info[0].As<Napi::Function>();
    cManager.CreateItemHelper();
    return Napi::Boolean::New(env, true);
  }else{
    return Napi::Boolean::New(env, false);
  }
}

/*
void UploadItem(const Napi::CallbackInfo& info){
  env = info.Env();
  v8::String::Utf8Value title(iso, args[0]);
  v8::String::Utf8Value description(iso, args[1]);
  v8::String::Utf8Value file(iso, args[2]);
  v8::String::Utf8Value file_preview(iso, args[3]);
  v8::String::Utf8Value res(iso, args[4]);
  v8::String::Utf8Value type(iso, args[5]);
  int tag = (int)args[6].As<Number>()->Value();

  std::string resTmp(*res);
  std::string typeTmp(*type);
  const char* resStr = resTmp.c_str();
  const char* typeStr = typeTmp.c_str();
  if(!(strcmp(resStr, "1080p") == 0 || strcmp(resStr, "2.7k") == 0 || strcmp(resStr, "4k") == 0 || strcmp(resStr, "Other") == 0)){
    return;
  }
  if(!(strcmp(typeStr, "Gif") == 0 || strcmp(typeStr, "Image") == 0 || strcmp(typeStr, "Video") == 0)){
    return;
  }
  std::vector<const char*> tag_list = GetTagList(resStr, typeStr, tag);


  const char** list = tag_list.data();
  const SteamParamStringArray_t stringParams = {
    list,
    tag_list.size()
  };

  //Update the created item with our values.
  updateHandle = SteamUGC()->StartItemUpdate(2003310, publishField);
  SteamUGC()->SetItemTitle( updateHandle, *title );
  SteamUGC()->SetItemDescription( updateHandle, *description );
  SteamUGC()->SetItemVisibility( updateHandle, k_ERemoteStoragePublishedFileVisibilityPublic);
  SteamUGC()->SetItemContent( updateHandle, *file);
  SteamUGC()->SetItemPreview( updateHandle, *file_preview);
  SteamUGC()->SetItemTags( updateHandle, &stringParams);
  SteamUGC()->SubmitItemUpdate( updateHandle, "Initial Upload");

  Local<Number> num = Number::New(iso, (uint64)publishField);
  args.GetReturnValue().Set(num);
}*/

Napi::String GetInstalledContent(const Napi::CallbackInfo& args){
    Napi::Env enva = args.Env();
  if(SteamInitialized) {
    uint32 num_subscribed = SteamUGC()->GetNumSubscribedItems();
    PublishedFileId_t* publishedFiles = new PublishedFileId_t[num_subscribed*sizeof(PublishedFileId_t)];
    SteamUGC()->GetSubscribedItems(publishedFiles, num_subscribed);

    std::string result = "?f=";
    for(uint32 i = 0; i < num_subscribed; i++){
      uint32 state = SteamUGC()->GetItemState( publishedFiles[i] );
      if(state & k_EItemStateInstalled){
        uint64 sizeOnDisk;
        uint32 size = 1024;
        char file[1024] = {NULL};
        uint32 punTimeStamp;
        SteamUGC()->GetItemInstallInfo(publishedFiles[i], &sizeOnDisk, file, size, &punTimeStamp);

        result += file;
        result += "?f=";
      }
    }
  
    const char* ret = result.c_str();
    return Napi::String::New(enva, result);
  }
}

Napi::Object Initialize(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "SteamInit"), Napi::Function::New(env, SteamInit));
  exports.Set(Napi::String::New(env, "UnlockAchievement"), Napi::Function::New(env, UnlockAchievement));
  exports.Set(Napi::String::New(env, "CreateItem"), Napi::Function::New(env, CreateItem));
  //exports.Set(Napi::String::New(env, "UploadItem"), Napi::Function::New(env, UploadItem));
  exports.Set(Napi::String::New(env, "GetInstalledContent"), Napi::Function::New(env, GetInstalledContent));
  exports.Set(Napi::String::New(env, "SteamShutdown"), Napi::Function::New(env, SteamShutdown));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Initialize)
