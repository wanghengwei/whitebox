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

	tplName := path.Base(tpl)
	tplPath := path.Join("tools/codegen/templates", tpl)
	return template.Must(template.New(tplName).Funcs(sprig.TxtFuncMap()).ParseFiles(tplPath)).Execute(f, data)
}

func generateAction(op string, act Action) error {
	err := generate(fmt.Sprintf("%sEvent.cpp.tpl", op), fmt.Sprintf("broker/autogen/%s.cpp", act.GetActionName()), act)
	if err != nil {
		return err
	}

	err = generate("Event.h.tpl", fmt.Sprintf("broker/autogen/%s.h", act.GetActionName()), act)
	if err != nil {
		return err
	}

	return nil
}

type Action interface {
	GetActionName() string
	GenerateCode() error
}

func main() {
	flag.Parse()

	f, err := os.Open("actions.yaml")
	if err != nil {
		glog.Fatal(err)
	}

	d := yaml.NewDecoder(f)

	actions := []Action{}

	// 先走一遍，把每个文档块的类型找出来
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

	// 重新，正式读一遍并解析出合适的对象
	f.Seek(0, 0)
	d = yaml.NewDecoder(f)

	for _, action := range actions {
		d.Decode(action)
	}

	for _, action := range actions {
		action.GenerateCode()
	}

	err = generate("x51.proto.tpl", "protos/x51.proto", actions)
	if err != nil {
		glog.Fatal(err)
	}

	err = generate("CMakeLists.txt.tpl", "broker/autogen/CMakeLists.txt", actions)
	// tmpl, err = template.New("cmake").Funcs(sprig.TxtFuncMap()).Parse(cmakeTemplate)
	if err != nil {
		glog.Fatal(err)
	}

	err = generate("init_grpc_async_calls.h.tpl", "broker/autogen/init_grpc_async_calls.h", actions)
	if err != nil {
		glog.Fatal(err)
	}

}