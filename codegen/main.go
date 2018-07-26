package main

import (
	"flag"
	"fmt"
	"os"
	"path"
	"text/template"

	"github.com/Masterminds/sprig"
	"github.com/golang/glog"
	"gopkg.in/yaml.v2"
)

func generate(tpl string, outfile string, data interface{}) error {
	f, err := os.Create(outfile)
	if err != nil {
		return err
	}
	defer f.Close()

	// tmpl, err := template.ParseFiles(tpl)
	return template.Must(template.New(path.Base(tpl)).Funcs(sprig.TxtFuncMap()).ParseFiles(tpl)).Execute(f, data)
	// if err != nil {
	// 	return err
	// }

	// // tmpl = tmpl.Funcs(sprig.TxtFuncMap())

	// return tmpl.Execute(f, data)
}

func generateAction(op string, act Action) error {
	err := generate(fmt.Sprintf("codegen/templates/%sEvent.cpp.tpl", op), fmt.Sprintf("broker/autogen/%s.cpp", act.GetActionName()), act)
	if err != nil {
		return err
	}

	err = generate("codegen/templates/Event.h.tpl", fmt.Sprintf("broker/autogen/%s.h", act.GetActionName()), act)
	if err != nil {
		return err
	}

	return nil
}

type Action interface {
	GetActionName() string
	GenerateCode() error
}

type SendEventAction struct {
	ActionType string `yaml:"type"`
	Spec       struct {
		EventName string `yaml:"eventName"`
		Params    []struct {
			Field     string `yaml:"field"`
			Constant  string `yaml:"constant"`
			ValueFrom string `yaml:"valueFrom"`
			ValueType string `yaml:"type"`
			Value     string
		} `yaml:"params"`
	} `yaml:"spec"`
}

func (act *SendEventAction) GetActionName() string {
	return act.Spec.EventName
}

func (act *SendEventAction) GenerateCode() error {

	for i := range act.Spec.Params {
		valueFrom := act.Spec.Params[i].ValueFrom
		if len(valueFrom) > 0 {
			// get value from player data
			act.Spec.Params[i].Value = "1"
			continue
		}
	}

	return generateAction("Send", act)
}

type RecvEventAction struct {
	ActionType string `yaml:"type"`
	Spec       struct {
		EventName string `yaml:"eventName"`
	} `yaml:"spec"`
}

func (act *RecvEventAction) GetActionName() string {
	return act.Spec.EventName
}

func (act *RecvEventAction) GenerateCode() error {
	return generateAction("Recv", act)
}

func main() {
	flag.Parse()

	wd, err := os.Getwd()
	if err != nil {
		glog.Fatal(err)
	}
	glog.Infof("working dir is %s\n", wd)

	f, err := os.Open("actions.yaml")
	if err != nil {
		glog.Fatal(err)
	}

	d := yaml.NewDecoder(f)

	actions := []Action{}

	for {
		tmp := map[interface{}]interface{}{}
		err := d.Decode(&tmp)
		if err != nil {
			break
		}

		switch tmp["type"] {
		case "SendEvent":
			actions = append(actions, &SendEventAction{})
			break
		case "RecvEvent":
			actions = append(actions, &RecvEventAction{})
			break
		default:

		}
	}

	f.Seek(0, 0)
	d = yaml.NewDecoder(f)

	for _, action := range actions {
		d.Decode(action)
	}

	for _, action := range actions {
		action.GenerateCode()
	}

	err = generate("codegen/templates/x51.proto.tpl", "protos/x51.proto", actions)
	if err != nil {
		glog.Fatal(err)
	}

	err = generate("codegen/templates/CMakeLists.txt.tpl", "broker/autogen/CMakeLists.txt", actions)
	// tmpl, err = template.New("cmake").Funcs(sprig.TxtFuncMap()).Parse(cmakeTemplate)
	if err != nil {
		glog.Fatal(err)
	}

	err = generate("codegen/templates/init_grpc_async_calls.h.tpl", "broker/autogen/init_grpc_async_calls.h", actions)
	if err != nil {
		glog.Fatal(err)
	}

	// // tmpl.Funcs(sprig.FuncMap())
	// autogenCMake, err := os.Create("broker/autogen/CMakeLists.txt")
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// tmpl.Execute(autogenCMake, actions)

}
