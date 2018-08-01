package main

import (
	"flag"
	"os"
	"whitebox/tools/codegen/ent"

	"github.com/golang/glog"
)

// func newEventItem(order string) Entity {
// 	switch order {
// 	case "Request":
// 		return &EventRequest{}
// 	case "Response":
// 		return &EventResponse{}
// 	default:
// 		log.Fatalf("no order %s\n", order)
// 		return nil
// 	}
// }

// func newActionItem(order string) Entity {
// 	switch order {
// 	case "SendRecvEvent":
// 		return &ActionSendRecvEvent{}
// 	default:
// 		log.Fatalf("no order %s\n", order)
// 		return nil
// 	}
// }

func main() {
	flag.Parse()

	f, err := os.Open("actions.yaml")
	if err != nil {
		glog.Fatal(err)
	}
	defer f.Close()

	entMgr := ent.NewEntityManager()
	err = entMgr.Parse(f)
	if err != nil {
		glog.Fatal(err)
	}

	err = entMgr.GenerateAll()
	if err != nil {
		glog.Fatal(err)
	}

	// d := yaml.NewDecoder(f)

	// // actions := []Action{}

	// items := []Entity{}

	// // 先走一遍，把每个文档块的类型找出来
	// for {
	// 	tmp := map[interface{}]interface{}{}
	// 	err := d.Decode(&tmp)
	// 	if err != nil {
	// 		break
	// 	}

	// 	// var a Action
	// 	var item Entity

	// 	cls := tmp["class"].(string)
	// 	order := tmp["order"].(string)

	// 	switch cls {
	// 	case "SendEvent":
	// 		// actions = append(actions, &SendEventAction{})
	// 		break
	// 	case "RecvEvent":
	// 		// actions = append(actions, &RecvEventAction{})
	// 		break
	// 	case "SendRecvEvent":
	// 		// a = &SendRecvEventAction{}
	// 	case "Event": // Event
	// 		item = newEventItem(order)
	// 	case "Action": // Action
	// 		item = newActionItem(order)
	// 	default:

	// 	}

	// 	// actions = append(actions, a)
	// 	items = append(items, item)
	// }

	// // 重新，正式读一遍并解析出合适的对象
	// f.Seek(0, 0)
	// d = yaml.NewDecoder(f)

	// // for _, action := range actions {
	// // 	d.Decode(action)
	// // }

	// for _, item := range items {
	// 	err := d.Decode(item)
	// 	if err != nil {
	// 		log.Fatalf("decode failed: item=%v, err=%s", item, err)
	// 	}
	// }

	// // 现在解析出对象了，需要生成代码
	// // 有两种代码生成需求：一种是每个对象本身产生若干输出文件，一种是整体进行产出
	// root := path.Join("broker", "autogen")

	// for _, item := range items {
	// 	item.Generate(root)
	// }

	// err = generate(root, items)
	// if err != nil {
	// 	log.Fatal(err)
	// }

	// // for _, action := range actions {
	// // 	action.Prepare()
	// // 	action.GenerateCode()
	// // }

	// // err = generate("x51.proto.tpl", "protos/x51.proto", actions)
	// // if err != nil {
	// // 	glog.Fatal(err)
	// // }

	// // err = generate("CMakeLists.txt.tpl", "broker/autogen/CMakeLists.txt", actions)
	// // // tmpl, err = template.New("cmake").Funcs(sprig.TxtFuncMap()).Parse(cmakeTemplate)
	// // if err != nil {
	// // 	glog.Fatal(err)
	// // }

	// // err = generate("init_grpc_async_calls.h.tpl", "broker/autogen/init_grpc_async_calls.h", actions)
	// // if err != nil {
	// // 	glog.Fatal(err)
	// // }

}
