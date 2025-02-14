export type Background = {
  index: string;
  name: string;
  starting_proficiencies: {
    index: string;
    name: string;
    url: string;
  }[];
  language_options: {
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      resource_list_url: string;
    };
  };
  starting_equipment: {
    equipment: {
      index: string;
      name: string;
      url: string;
    };
    quantity: number;
  }[];
  starting_equipment_options: {
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      equipment_category: {
        index: string;
        name: string;
        url: string;
      };
    };
  }[];
  feature: {
    name: string;
    desc: string[];
  };
  personality_traits: {
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      options: {
        option_type: string;
        string: string;
      }[];
    };
  };
  ideals: {
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      options: {
        option_type: string;
        desc: string;
        alignments: {
          index: string;
          name: string;
          url: string;
        }[];
      }[];
    };
  };
  bonds: {
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      options: {
        option_type: string;
        string: string;
      }[];
    };
  };
  flaws: {
    choose: number;
    type: string;
    from: {
      option_set_type: string;
      options: {
        option_type: string;
        string: string;
      }[];
    };
  };
  url: string;
  updated_at: string;
};
