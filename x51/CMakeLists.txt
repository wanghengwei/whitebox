cmake_minimum_required(VERSION 3.11)

project(x51)

include(FetchContent)

# global settings
include_directories(${CMAKE_BINARY_DIR}/_stage/include)
link_directories(${CMAKE_BINARY_DIR}/_stage/lib)

# 获取项目的代码
FetchContent_Declare(proj
    SVN_REPOSITORY http://172.17.100.22/svn/starx52/trunc
    SVN_USERNAME wanghengwei
    SVN_PASSWORD wanghengwei
)
FetchContent_GetProperties(proj)
if(NOT proj_POPULATED)
    FetchContent_Populate(proj)
endif()
set(PROJ_SOURCES
    modules/login/shared/events/event_register.cpp
    modules/playermanager/shared/events/playermanager_event_register.cpp
    modules/channel/shared/EventRegisterChannel.cpp
    modules/ring_team/share/RingTeamEventReg.cpp
    modules/sns/event/event_register.cpp
    modules/community/shared/events/community_event_register.cpp
    modules/community_new/entity_event/entity_event.cpp
    modules/community/entity_event/entity_event.cpp
    share/community/community_point.cpp
    modules/pet/shared/events/pet_events_register.cpp
    # modules/shop/shared/EventRegister.cpp
    modules/shop/shared/event_register_shop.cpp
    modules/global_community/share/event/global_community_event_reg.cpp
    modules/global_pk/share/event/globalpk_event_reg.cpp
    # modules/chat/shared/EventRegister.cpp
    modules/chat/shared/event_register_chat.cpp
    modules/global_team/share/global_team_event_reg.cpp
    modules/global_team/share/global_team_predef.cpp
    modules/anni_feedback/share/event/anni_feedback_event_register.cpp
    modules/anni_feedback/share/anni_feedback_info.cpp
    modules/global_wedding/shared/events/event_global_wedding_reg.cpp
    modules/community_new/entity_event/entity_event_register.cpp
    modules/community_new/entity_event/entity_event_inline_function.cpp
    zone_server/GuildServer/Guild/super_guild/share/event/event_super_guild_reg.cpp
    # modules/guild/shared/EventRegister.cpp
    modules/guild/shared/event_register_guild.cpp
    zone_server/GuildServer/Guild/super_guild/share/event/event_super_guild_reg.cpp
    modules/cloth_collocation/share/cloth_collocation_event_imp.cpp
    share/game_event/EventFragmentManager.cpp
    modules/item/shared/events/event_register.cpp
    game_proxy/h5/H5ConvertEvent.cpp
    share/third_part/cjson/cJSON.cpp
    modules/global_async_pk/share/global_async_pk_event_reg.cpp
    modules/snake_game_out/share/snake_game_out_event_reg.cpp
    global_service/multi_snakesmatch_server/Logic/snakes_event_reg.cpp
    modules/global_dance/share/event/global_dance_event_reg.cpp
    modules/global_dance/share/event/global_dance_match_event_reg.cpp
    share/game_event/star/gamelogic/GLEvent_LoadingProgress.cpp
    share/game_event/star/gamelogic/GLEvent_LoginVerify.cpp
    share/game_event/star/gamelogic/GLEvent_LoginVerifyReply.cpp
    share/game_event/star/gamelogic/GLEvent_PrepareReady.cpp
    share/game_event/star/gamelogic/GLEvent_GameActionResult.cpp
    share/game_event/star/gamelogic/GLEvent_EndGame.cpp

    modules/global_dance/share/global_dance_info_def.cpp
    modules/playermanager/interface/CharacterInfo.cpp
    modules/achievement/shared/player_title_info.cpp
    modules/RaffleCity/user_define_lottery/share/UserDefineLotteryRegister.cpp
    modules/RaffleCity/capsule_toys_lottery/share/CapsuleToysEventRegister.cpp
    modules/ipgw/shared/events/eventdef.cpp
    modules/homeland/shared/events/homeland_events_reg.cpp
    modules/homeland/shared/homeland_info.cpp
    share/date_time.cpp
    modules/quest/shared/events/EventRegister.cpp
    modules/quest/shared/QuestTemplateEvtImp.cpp
    # ../workthrough/QuestTemplate.cpp
    modules/quest/shared/QuestInstance_BaseImp.cpp
    modules/hide_and_seek/share/hide_and_seek_event_reg.cpp
    modules/hide_and_seek/share/hide_and_seek_def.cpp
    modules/hide_and_seek/share/hide_and_seek_game_def.cpp
    modules/contacts/shared/EventRegisterContacts.cpp
    modules/contacts/shared/StarFriendInfo.cpp
    modules/story_mode/share/story_mode_event_reg.cpp

    global_service/global_lord_logic_server/src/global_lord_helper.cpp
    global_service/global_lord_logic_server/src/global_lord_logic_def.cpp
    modules/chat/shared/event_register_chat.cpp
    modules/match_select/shared/match_select_event_reg.cpp
)

# 拼接出绝对路径
list(TRANSFORM PROJ_SOURCES PREPEND "${proj_SOURCE_DIR}/")

# 这是使用x51代码必须使用的include path
set(PROJ_INCLUDE_DIRS
    ${proj_SOURCE_DIR} 
    ${proj_SOURCE_DIR}/share
)

# set(PROJ_SOURCES ${PROJ_SOURCES} PARENT_SCOPE)
# set(MGC_INCLUDE_DIRS ${MGC_INCLUDE_DIRS} PARENT_SCOPE)

# 获取broker公共代码
FetchContent_Declare(broker_common
    URL ${CMAKE_SOURCE_DIR}/../broker_common
)
FetchContent_GetProperties(broker_common)
if (NOT broker_common_POPULATED)
    FetchContent_Populate(broker_common)
    add_subdirectory(${broker_common_SOURCE_DIR} ${broker_common_BINARY_DIR})
endif()

add_subdirectory(protos)

add_subdirectory(autogen)

# 最终的exe
add_executable(broker 
    ${PROJ_SOURCES} 
    app.cpp 
    x51_server.cpp 
    x51_connector_manager.cpp
    x51_connector.cpp
    x51_connection.cpp

    QuestTemplate.cpp
)
target_include_directories(broker PRIVATE ${PROJ_INCLUDE_DIRS})
target_link_libraries(broker broker_common autogen)
target_compile_options(broker PRIVATE -Wno-format -Wno-deprecated-declarations -Wno-narrowing -include limits.h)

# add_dependencies(proto_broker broker_common)
