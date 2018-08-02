package ent

import (
	"fmt"
	"io"
	"log"

	yaml "gopkg.in/yaml.v2"
)

const (
	CLASS_ACTION = "Action"
	CLASS_EVENT  = "Event"

	ORDER_REQUEST  = "Request"
	ORDER_RESPONSE = "Response"

	ORDER_SENDRECVEVENT = "SendRecvEvent"

	AUTOGEN_CPP_FOLDER = "broker/autogen/"
	PROTOS_FOLDER      = "protos/"
)

// Entity 表示一个实体，如：Event Action
type Entity interface {
	Class() string
	Order() string
	Name() string
	Generate() error
	OutputFileNames() []string
	// 用于解析后进行一些处理。比如填充一些yml文件里可能没写的值，如name字段
	OnParsed() error
}

type Event interface {
	Entity
	EventName() string
}

type Action interface {
	Entity
	FillEventsByRef(map[string]Event) error
}

type EntityManager interface {
	Parse(io.ReadSeeker) error
	GenerateAll() error
}

func NewEntityManager() EntityManager {
	return &entityManagerImpl{}
}

type entityManagerImpl struct {
	events  []Event
	actions []Action
}

func (em *entityManagerImpl) Parse(reader io.ReadSeeker) error {
	d := yaml.NewDecoder(reader)

	items := []Entity{}

	// 先走一遍，把每个文档块的类型找出来
	for {
		tmp := map[interface{}]interface{}{}
		err := d.Decode(&tmp)
		if err != nil {
			if err == io.EOF {
				break
			}

			return fmt.Errorf("first decode failed: error=%s", err)
		}

		var item Entity

		cls := tmp["class"].(string)
		order := tmp["order"].(string)

		switch cls {
		case CLASS_EVENT: // Event
			item = newEventItem(order)
		case CLASS_ACTION: // Action
			item = newActionItem(order)
		default:

		}

		// actions = append(actions, a)
		items = append(items, item)
	}

	// 重新，正式读一遍并解析出合适的对象
	reader.Seek(0, 0)
	d = yaml.NewDecoder(reader)

	for _, item := range items {
		err := d.Decode(item)
		if err != nil {
			return err
		}

		err = item.OnParsed()
		if err != nil {
			return err
		}

		if item.Class() == CLASS_ACTION {
			em.actions = append(em.actions, item.(Action))
		} else if item.Class() == CLASS_EVENT {
			em.events = append(em.events, item.(Event))
		} else {
			return fmt.Errorf("invalid class: %s", item.Class())
		}
	}

	// 通过event ref找到真正的 event

	err := em.fillEventByRef()
	if err != nil {
		return err
	}

	return nil
}

func (em *entityManagerImpl) fillEventByRef() error {
	eventMap := map[string]Event{}
	for _, event := range em.events {
		eventMap[event.Name()] = event
	}
	for _, action := range em.actions {
		err := action.FillEventsByRef(eventMap)
		if err != nil {
			return err
		}
	}

	return nil
}

func (em *entityManagerImpl) GenerateAll() error {
	err := em.generateEvents()
	if err != nil {
		return nil
	}

	err = em.generateActions()
	if err != nil {
		return err
	}

	err = em.generateCMakeLists()
	if err != nil {
		return err
	}

	err = em.generateProtos()
	if err != nil {
		return err
	}
	err = em.generateInitCpp()
	if err != nil {
		return err
	}

	return nil
}

func (em *entityManagerImpl) generateEvents() error {
	for _, item := range em.events {
		err := item.Generate()
		if err != nil {
			return err
		}
	}

	return nil
}

func (em *entityManagerImpl) generateActions() error {
	for _, item := range em.actions {
		err := item.Generate()
		if err != nil {
			return err
		}
	}

	return nil
}

func (em *entityManagerImpl) generateCMakeLists() error {
	// 生成 cmakelists.txt
	files := []string{}
	for _, item := range em.events {
		files = append(files, item.OutputFileNames()...)
	}
	for _, item := range em.actions {
		files = append(files, item.OutputFileNames()...)
	}

	err := executeTemplate(CMAKELISTS_TEMPLATE, AUTOGEN_CPP_FOLDER, "CMakeLists.txt", files)

	return err
}

func (em *entityManagerImpl) generateProtos() error {
	return executeTemplate(PROTO_TEMPLATE, PROTOS_FOLDER, "x51.proto", em.actions)
}

func (em *entityManagerImpl) generateInitCpp() error {
	return executeTemplate(AUTOGEN_INIT_TEMPLATE, AUTOGEN_CPP_FOLDER, "autogen_init.h", em.actions)
}

func newActionItem(order string) Entity {
	switch order {
	case "SendRecvEvent":
		return &ActionSendRecvEvent{}
	default:
		log.Fatalf("no order %s\n", order)
		return nil
	}
}

func newEventItem(order string) Entity {
	switch order {
	case ORDER_REQUEST:
		return &EventRequest{}
	case ORDER_RESPONSE:
		return &EventResponse{}
	default:
		log.Fatalf("no order %s\n", order)
		return nil
	}
}
