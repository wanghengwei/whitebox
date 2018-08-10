#include <modules/quest/shared/QuestTemplate.h>


class CQuestInstance
{

};

CQuestTemplate::~CQuestTemplate() {
    
}

CQuestInstance* CQuestTemplate::CreateInstance(IPlayer* player) {
    return nullptr;
}

CQuestInstance* CQuestTemplate::CreateInstanceForInnerQuest(IPlayer* player) {
	return nullptr;
}

bool CQuestTemplate::CanAccept(IPlayer* player,quest_event_base* event) {
    return false;
}

void CQuestTemplate::SnapShot(int lv,unsigned int verbose)const {

}

CQuestInstance CQuestTemplate::CreateInstanceForShow(IPlayer *player) {
    return CQuestInstance();
}
