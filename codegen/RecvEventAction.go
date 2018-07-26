package main

type RecvEventAction struct {
	ActionType string `yaml:"type"`
	Spec       struct {
		EventName      string   `yaml:"eventName"`
		IncludeHeaders []string `yaml:"include_headers"`
	} `yaml:"spec"`
}

func (act *RecvEventAction) GetActionName() string {
	return act.Spec.EventName
}

func (act *RecvEventAction) GenerateCode() error {
	return generateAction("Recv", act)
}
