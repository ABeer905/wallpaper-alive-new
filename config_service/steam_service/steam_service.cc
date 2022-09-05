#include "napi.h"
#include "steam_sdk/steam_api.h"
#include "vector"

bool SteamInitialized; 
bool messageListener;
Napi::Env env = nullptr;
Napi::Function cb;
PublishedFileId_t publishField; //File for publishing to workshop
UGCUpdateHandle_t updateHandle;
const char* defaultTags[] = {
  "Miscellaneous",
  "Absctract",
  "Aesthetic",
  "Anime",
  "Fantasy",
  "Games",
  "NSFW",
  "Outdoors",
  "Pixel Graphics",
  "Relaxing",
  "Sci-Fi",
  "Space",
  "Sports",
  "Vehicles"
};

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

void UnlockAchievement(const Napi::CallbackInfo& info){
  if(SteamInitialized){
    SteamUserStats()->SetAchievement(((std::string)info[0].As<Napi::String>()).c_str());
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

Napi::Number UploadItem(const Napi::CallbackInfo& info){
  Napi::Env enva = info.Env();

  std::vector<const char*> tag_list;
  Napi::Array tags = info[2].As<Napi::Array>();
  std::string type = info[5].ToString().Utf8Value();
  std::string res = info[6].ToString().Utf8Value();
  tag_list.push_back(type.c_str());
  tag_list.push_back(res.c_str());
  for(size_t i = 0; i < tags.Length(); i++){
    std::string tag = Napi::Value(tags[i]).ToString().Utf8Value();
    for(int i = 0; i < 14; i++){
      if(strcmp(tag.c_str(), defaultTags[i]) == 0){
        tag_list.push_back(defaultTags[i]);
      }
    }
  }
  const SteamParamStringArray_t stringParams = {
    tag_list.data(),
    tag_list.size()
  };

  //Update the created item with our values.
  updateHandle = SteamUGC()->StartItemUpdate(2003310, publishField);
  SteamUGC()->SetItemTitle( updateHandle, ((std::string)info[0].As<Napi::String>()).c_str());
  SteamUGC()->SetItemDescription( updateHandle, ((std::string)info[1].As<Napi::String>()).c_str());
  SteamUGC()->SetItemTags( updateHandle, &stringParams);
  SteamUGC()->SetItemContent( updateHandle, ((std::string)info[3].As<Napi::String>()).c_str());
  SteamUGC()->SetItemPreview( updateHandle, ((std::string)info[4].As<Napi::String>()).c_str());
  SteamUGC()->SetItemVisibility( updateHandle, k_ERemoteStoragePublishedFileVisibilityPublic);
  SteamUGC()->SubmitItemUpdate( updateHandle, "Initial Upload");
  return Napi::Number::New(enva, publishField);
}

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
  return Napi::String::New(enva, "");
}

Napi::Object Initialize(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "SteamInit"), Napi::Function::New(env, SteamInit));
  exports.Set(Napi::String::New(env, "UnlockAchievement"), Napi::Function::New(env, UnlockAchievement));
  exports.Set(Napi::String::New(env, "CreateItem"), Napi::Function::New(env, CreateItem));
  exports.Set(Napi::String::New(env, "UploadItem"), Napi::Function::New(env, UploadItem));
  exports.Set(Napi::String::New(env, "GetInstalledContent"), Napi::Function::New(env, GetInstalledContent));
  exports.Set(Napi::String::New(env, "SteamShutdown"), Napi::Function::New(env, SteamShutdown));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Initialize)
